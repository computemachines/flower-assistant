"""
Handlers for prompt-related IPC messages.
"""
import logging
from typing import Dict, Any
import time

from ...messages.domain_types import Message
from ..context import AppContext  # Import from context.py instead of handler.py

logger = logging.getLogger(__name__)

async def handle_new_prompt(message: Dict[str, Any], context: AppContext) -> None:
    """
    Handle 'new-prompt' messages from the frontend.
    
    This creates a Message object from the payload and adds it to the prompt queue.
    
    Args:
        message: The raw message dictionary containing the new prompt
        context: Application context containing the prompt queue
    """
    try:
        # Extract the prompt details from the message
        if "content" not in message:
            logger.error("Missing 'content' in new-prompt message")
            raise ValueError("Invalid new-prompt message format: missing 'content'")
            
        content = message["content"]
        msg_id = content.get("id")
        msg_role = content.get("role")
        msg_content = content.get("content")
        
        # Validate required fields
        if not msg_id:
            msg_id = f"user-{int(time.time() * 1000)}"  # Generate ID if missing
            
        if not msg_role or msg_role != "user":
            logger.warning(f"Invalid role in new-prompt: {msg_role}, forcing 'user'")
            msg_role = "user"
            
        if not isinstance(msg_content, str):
            logger.error(f"Invalid content type in new-prompt: {type(msg_content)}")
            raise ValueError("Prompt content must be a string")
        
        # Create a Message object
        message_obj = Message(msg_id, msg_role, msg_content)
        logger.info(f"Created new prompt with ID: {message_obj.id}")
        
        # Put the message in the prompt queue for processing
        await context.prompt_queue.put(message_obj)
        logger.info(f"Enqueued prompt: {message_obj.id}")
        
    except KeyError as e:
        logger.error(f"Missing key in prompt message: {e}")
        raise ValueError(f"Invalid message format: missing {e}")
    except Exception as e:
        logger.error(f"Error handling new-prompt: {e}")
        raise