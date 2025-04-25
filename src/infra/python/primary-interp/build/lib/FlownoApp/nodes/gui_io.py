from flowno import FlowHDL, node, Stream, AsyncQueue, sleep
import logging
import nodejs_callback_bridge  # Import for sending messages to frontend

from ..messages.domain_types import Message
from ..messages.ipc_schema import ChunkedResponse
from ..messages.ipc_schema import SentenceEvent, SentenceEventPayload, SentenceDoneRequest
from .inference import new_id

logger = logging.getLogger(__name__)

@node(stream_in=["response_chunks"])
async def GUIChat(
    prompt_queue: AsyncQueue[Message],
    response_chunks: Stream[ChunkedResponse] | None = None,
):
    """
    Sends streaming responses to the GUI via the NodeJS callback bridge,
    then waits for a new prompt from the prompt queue. The prompt queue
    is populated by the bridge message handler when a new prompt is received.
    
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

@node(stream_in=["sentences"])
class SentenceSpeaker:
    """
    A node that receives sentence events and sends them to the frontend.
    Also handles playback completion notifications from frontend.
    
    Args:
        sentences: Stream of SentenceEvent objects to be sent to the frontend
    """

    sentence_queue: AsyncQueue[SentenceEvent] = AsyncQueue()
    speak_task = None
    # Counter to preserve sentence ordering (for non-sequential playback options)
    sentence_counter: int = 0
    # Dictionary to track in-flight sentences awaiting playback confirmation
    pending_sentences: dict[str, SentenceEvent] = {}

    def start_speak_task(self, loop: FlowHDL):
        """
        Start the task that sends sentences to the frontend.
        
        Args:
            loop: The event loop to run the task in
        """

        async def speak():
            while True:
                # Get the next sentence event from the queue
                sentence_event = await self.sentence_queue.get()
                
                # Store in pending sentences dict for reference when playback completes
                self.pending_sentences[sentence_event.payload.id] = sentence_event
                
                # Send the event directly to the frontend
                nodejs_callback_bridge.send_message(sentence_event)
                
                # We no longer need to simulate speaking time - the frontend will
                # notify us when playback is complete through a SentenceDoneRequest
                await sleep(2)
                
                logger.debug(f"Sent sentence event: id={sentence_event.payload.id}, " +
                             f"text={sentence_event.payload.text[:30]}{'...' if len(sentence_event.payload.text) > 30 else ''}")

        if self.speak_task is None:
            self.speak_task = loop.create_task(speak())
            logger.debug("Started speak task")

    async def call(self, sentences: Stream[SentenceEvent]):
        """
        Process the stream of sentence events and send them to the queue.
        
        Args:
            sentences: Stream of SentenceEvent objects
        """
        async for sentence_event in sentences:
            await self.sentence_queue.put(sentence_event)
            
    async def handle_sentence_done(self, sentence_id: str):
        """
        Handle notification from frontend that a sentence has finished playing.
        
        Args:
            sentence_id: ID of the sentence that finished playing
        """
        if sentence_id in self.pending_sentences:
            # Remove from pending dict once playback is confirmed
            del self.pending_sentences[sentence_id]
            logger.debug(f"Sentence playback complete: id={sentence_id}")
        else:
            logger.warning(f"Received completion for unknown sentence: id={sentence_id}")
