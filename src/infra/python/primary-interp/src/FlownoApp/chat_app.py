from dataclasses import dataclass
from typing import Any, Literal, final, Dict
from flowno import FlowHDL, node, Stream, AsyncQueue, sleep
import traceback
import sys
import nodejs_callback_bridge


@node(stream_in=["response_chunks"])
async def SendToGUI(response_chunks: Stream[str], response_id: int):
    if response_chunks:
        async for chunk in response_chunks:
            message_obj = {
                "type": "chunk",
                "content": chunk,
                "response_id": response_id,
                "final": False  # Default to False for intermediate chunks
            }
            nodejs_callback_bridge.send_message(message_obj)
        
        # Send a final message to indicate completion
        final_message_obj = {
            "type": "chunk",
            "content": "",  # Empty content for final message
            "response_id": response_id,
            "final": True
        }
        nodejs_callback_bridge.send_message(final_message_obj)

@dataclass
class RendererMessage:
    """Message object to be sent to the GUI."""
    id: str
    content: str
    role: Literal["user", "assistant", "system"]

@final
class ChatApp:
    def __init__(self):
        self.prompt_queue = AsyncQueue[RendererMessage]()
        self.f = None
        self.instance_id = id(self)

    def run(self):
        @node
        async def ReceiveUserInput() -> RendererMessage:
            prompt = await self.prompt_queue.get()
            return prompt

        @node
        async def DummyInference(prompt: RendererMessage):
            print(f"Processing prompt: {prompt}")
            content = prompt.content
            for word in content.split():
                # Simulate some processing time
                await sleep(0.1)
                yield word + " "  # Keep the whitespace after each word
                
            # data not used
            raise StopAsyncIteration({
                "status": "complete", 
                "result": content.upper(),
                "metadata": {
                    "wordCount": len(content.split()),
                    "charCount": len(content),
                    "type": prompt.role
                }
            })

        # Create flow graph
        with FlowHDL() as f:
            f.receive_user_input = ReceiveUserInput()
            f.dummy_inference = DummyInference(f.receive_user_input)
            f.send_to_gui = SendToGUI(f.dummy_inference, 42)
            
        self.f = f
            
        self.f.run_until_complete()

    async def enqueue_prompt(self, prompt: RendererMessage):
        """Enqueue a prompt for processing."""
        print(f"Enqueueing prompt: {prompt}")
        await self.prompt_queue.put(prompt)

    def handle_message(self, message: Any):
        """Invoked by the NodeJS callback bridge when a message is received."""
        if self.f:
            self.f.create_task(self.enqueue_prompt(RendererMessage(**message)))


# Create a single instance of the app
app = ChatApp()
nodejs_callback_bridge.register_message_listener(app.handle_message)
