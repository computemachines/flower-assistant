from collections.abc import AsyncGenerator, Callable, Coroutine
from dataclasses import dataclass
from hmac import new
from json import JSONEncoder
from typing import Any, Literal, final, Dict, Optional
from typing_extensions import TypeVarTuple, Unpack

import logging
import os
import sys
import traceback
import time

from flowno import EventLoop, FlowHDL, node, Stream, AsyncQueue, sleep
from flowno.io import Headers, HttpClient
from flowno.io.http_client import HTTPException, streaming_response_is_ok

import nodejs_callback_bridge
from .renderer_message import (
    Message,
    RendererMessageBase,
    NewPromptMessage,
    EditMessage,
    GetHistoryMessage,
    DeleteMessage,
    RendererMessage,
)

# Set logging level to WARNING to reduce log output
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------


# JSON encoder for the HTTP client.
class MessageJSONEncoder(JSONEncoder):
    def default(self, o: Any):
        if isinstance(o, Message):
            # TODO: Examine if the `id` field is a problem for the API
            return {"role": o.role, "content": o.content}
        # Add logging for unexpected types
        logger.error(f"MessageJSONEncoder encountered unexpected type: {type(o).__name__} - Object: {o!r}")
        return super().default(o)


@dataclass
class NewResponseMessage(RendererMessageBase):
    type: Literal["new-response"]
    response: Message


@dataclass
class ChunkedResponse:
    type: Literal["chunk"]
    id: str
    response_id: str
    content: str
    finish_reason: str | None = None


# JSON encoder for the nodejs callback bridge.
class NodeJSMessageJSONEncoder(JSONEncoder):
    def default(self, o: Any):
        if isinstance(o, ChunkedResponse):
            result = {
                "type": o.type,
                "id": o.id,
                "response_id": o.response_id,
                "content": o.content,
            }
            if o.finish_reason is not None:
                result["finish_reason"] = o.finish_reason
            return result
        elif isinstance(o, Message):
            return {
                "id": o.id,
                "role": o.role,
                "content": o.content,
            }
        elif isinstance(o, NewResponseMessage):
            return {
                "type": o.type,
                "response": o.response,
            }

        return super().default(o)


nodejs_callback_bridge.set_json_encoder(NodeJSMessageJSONEncoder())

# ---------------------------------------------------------------------
# HTTP Client Setup
# ---------------------------------------------------------------------


# Alias for a list of Message objects.
Messages = list[Message]

# Get the API token from environment variables.
TOKEN = os.environ.get("GROQ_API_KEY", "")
API_URL = "http://localhost:5000/v1/chat/completions"

headers = Headers()
headers.set("Authorization", f"Bearer {TOKEN}")

client = HttpClient(headers=headers)
client.json_encoder = MessageJSONEncoder()

# ---------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------

Ts = TypeVarTuple("Ts")


def handle_task(flow: FlowHDL, task: Callable[[*Ts], Coroutine[Any, Any, None]]):
    """A partial function that enqueues the task on the event loop."""

    def wrapper(*args: Unpack[Ts]):
        # Enqueue the task on the event loop
        flow.create_task(task(*args))

    return wrapper


def new_id(prefix: str) -> str:
    """Generate a new unique ID with a prefix."""
    return f"{prefix}-{int(time.time() * 1000)}"  # Convert to milliseconds


def create_blank_response():
    new_response_id = new_id("response")
    message = NewResponseMessage(
        type="new-response",
        response=Message(
            id=new_response_id,
            role="assistant",
            content="",
        ),
    )
    nodejs_callback_bridge.send_message(message)
    return new_response_id


# ---------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------


@node(stream_in=["response_chunks"])
async def GUIChat(
    prompt_queue: AsyncQueue[Message],
    response_chunks: Stream[ChunkedResponse] | None = None,
):
    """Sends messages to the GUI via the NodeJS callback bridge, then waits for a new prompt."""
    if response_chunks:
        async for chunk in response_chunks:
            # Simply forward the ChunkedResponse object to the JS side
            nodejs_callback_bridge.send_message(chunk)

    # Wait for a new prompt
    prompt = await prompt_queue.get()
    return prompt

@node(stream_in=["chunks"])
async def ChunkContents(chunks: Stream[ChunkedResponse]):
    async for chunk in chunks:
        yield chunk.content

@node
async def LatestMessage(
    messages: Messages,
) -> Message | None:
    """
    Returns the latest message from the chat history.
    """
    if messages:
        return messages[-1]
    return None


@node
class ChatHistory:
    """
    Maintains the chat history. The initial system message seeds the conversation.
    """

    messages: Messages = [Message("system-0", "system", "You are a helpful assistant.")]

    async def call(self, new_prompt: Message, last_response: str = "") -> Messages:
        if type(last_response) is not str:
            raise TypeError(
                f"Expected last_response to be a string, got {type(last_response).__name__}"
            )
        if last_response:
            last_message = self.messages[-1]
            self.messages.append(
                Message(f"{last_message.id}-resp", "assistant", last_response)
            )
        self.messages.append(new_prompt)

        return self.messages


@node
async def Inference(messages: Messages):
    """
    Streams the LLM API response.
    """
    # Log the types of messages received by Inference
    message_types = [type(msg).__name__ for msg in messages]
    logger.warning(f"Inference node received messages with types: {message_types}")
    
    # Filter out any non-Message objects before sending to the API
    api_messages = [msg for msg in messages if isinstance(msg, Message)]
    # Log if filtering removed any messages (indicating unexpected types were present)
    if len(api_messages) != len(messages):
        logger.warning(f"Filtered messages for API. Original count: {len(messages)}, Filtered count: {len(api_messages)}")

    response = await client.stream_post(
        API_URL,
        json={
            "messages": api_messages,
            "model": "llama-3.3-70b-versatile",
            "stream": True,
        },
    )

    if not streaming_response_is_ok(response):
        # Keep this error log as it's critical for troubleshooting
        logger.error("API response error: %s", response.status)
        raise HTTPException(response.status, response.body)
    
    new_response_id = create_blank_response()

    async for response_stream_json in response.body:
        try:
            choice = response_stream_json["choices"][0]

            # Extract the content chunk
            chunk: str = choice["delta"]["content"]

            # Create a ChunkedResponse object to yield
            chunk_response = ChunkedResponse(
                type="chunk",
                id=new_id("chunk"),
                response_id=new_response_id,
                content=chunk,
                finish_reason=choice.get("finish_reason")
            )

            yield chunk_response
        except Exception as e:
            logger.error("Error processing API response: %s", str(e))
            raise


# ---------------------------------------------------------------------
# Chat Application
# ---------------------------------------------------------------------


@final
class ChatApp:
    f: FlowHDL

    def __init__(self):
        self.prompt_queue = AsyncQueue[Message]()

        # Create flow graph
        with FlowHDL() as f:
            f.gui_chat = GUIChat(self.prompt_queue, f.inference)
            f.inference = Inference(f.history)
            f.chunk_contents = ChunkContents(f.inference)
            f.history = ChatHistory(f.gui_chat, f.chunk_contents)

        self.f = f
        nodejs_callback_bridge.register_message_listener(
            handle_task(self.f, self.handle_message)
        )

    def run(self):
        self.f.run_until_complete()

    async def handle_message(self, message: Dict):
        """Handle a message and enqueue a prompt for processing."""
        try:
            # Message from frontend is a dictionary that should have a 'type' field
            if isinstance(message, dict) and "type" in message:
                if message["type"] == "new-prompt":
                    # Remove verbose console logging

                    # Extract the Message content from the NewPromptMessage format
                    content = message["content"]
                    msg_id = content["id"]
                    msg_role = content["role"]
                    msg_content = content["content"]

                    # Create a Message object from the extracted fields
                    message_obj = Message(msg_id, msg_role, msg_content)

                    # Enqueue the message for processing
                    await self.prompt_queue.put(message_obj)
                else:
                    raise NotImplementedError(
                        f"Message type {message['type']} not implemented."
                    )
            else:
                # For backward compatibility, handle simple message dictionaries without a type
                if (
                    isinstance(message, dict)
                    and "role" in message
                    and "content" in message
                    and "id" in message
                ):
                    # Create a Message object directly
                    message_obj = Message(
                        message["id"], message["role"], message["content"]
                    )
                    await self.prompt_queue.put(message_obj)
                else:
                    # Log only critical errors
                    logger.error("Invalid message format received")
                    raise ValueError("Invalid message format")
        except Exception as e:
            # Only log the exception type, not the full traceback
            logger.error("Error handling message: %s", str(e))
            raise


# -----------------------------------------------------
# Create a single instance of the app
# -----------------------------------------------------
app = ChatApp()
