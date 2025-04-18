from flowno import node, Stream, AsyncQueue
import logging
import nodejs_callback_bridge  # Import for sending messages to frontend

from ..messages.domain_types import Message
from ..messages.ipc_schema import ChunkedResponse

logger = logging.getLogger(__name__)

@node(stream_in=["response_chunks"])
async def GUIChat(
    prompt_queue: AsyncQueue[Message],
    response_chunks: Stream[ChunkedResponse] | None = None,
):
    """
    Sends streaming responses to the GUI via the NodeJS callback bridge,
    then waits for a new prompt from the prompt queue.
    
    Args:
        prompt_queue: Queue to receive new prompts from the frontend
        response_chunks: Stream of ChunkedResponse objects to forward to the frontend
        
    Returns:
        Message: The next user prompt from the queue
    """
    if response_chunks:
        async for chunk in response_chunks:
            # Forward the ChunkedResponse object to the JS side
            nodejs_callback_bridge.send_message(chunk)
            logger.debug(f"Sent chunk: {chunk.id} for response {chunk.response_id}")

    # Wait for a new prompt from the queue
    logger.debug("Waiting for new prompt...")
    prompt = await prompt_queue.get()
    logger.debug(f"Received prompt: {prompt.id}")
    return prompt