"""
Handlers for sentence-related messages from the frontend.
"""
import logging

from ...ipc.context import AppContext
from ...messages.ipc_schema import SentenceDoneRequest

logger = logging.getLogger(__name__)

async def handle_sentence_done(message: dict, context: AppContext) -> None:
    """
    Handle notification that a sentence has finished playing on the frontend.
    
    Args:
        message: The raw message dictionary from the frontend
        context: Application context containing queues and state
    """
    try:
        # Extract the sentence ID from the payload
        sentence_id = message.get("payload", {}).get("id")
        
        if not sentence_id:
            logger.error("Received sentence-done without an ID")
            return
            
        # Get the SentenceSpeaker node and call its handler
        sentence_speaker = context.flow_hdl.tts
        if sentence_speaker:
            await sentence_speaker.handle_sentence_done(sentence_id)
        else:
            logger.error("SentenceSpeaker node not available in FlowHDL context")
            
    except Exception as e:
        logger.error(f"Error handling sentence-done message: {e}")