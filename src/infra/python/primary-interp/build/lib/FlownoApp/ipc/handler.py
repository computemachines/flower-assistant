"""
Central IPC message handler that uses the registry to dispatch messages.
"""
import logging
from typing import Any

from .context import AppContext
from .registry import MESSAGE_HANDLERS
from ..messages.ipc_schema import ErrorResponse, ErrorPayload

logger = logging.getLogger(__name__)

async def handle_message(message: dict[str, object], context: AppContext) -> None:
    """
    Central handler for all IPC messages from the frontend.
    
    Args:
        message: The raw message dictionary from the frontend
        context: Application context containing queues and state
    """
    # Extract the message type
    message_type = message.get("type")
    
    if not message_type:
        logger.error("Received message without a type field")
        # No way to send error response without knowing the message type
        return
        
    # Look up the handler for this message type
    handler = MESSAGE_HANDLERS.get(message_type)
    
    if handler:
        try:
            # Call the handler with the message and context
            await handler(message, context)
        except Exception as e:
            logger.error(f"Error handling message type '{message_type}': {str(e)}")
            try:
                import nodejs_callback_bridge
                
                # Send error response back to frontend
                error_response = ErrorResponse(
                    type="error",
                    payload=ErrorPayload(
                        message=f"Error processing request: {str(e)}",
                        originalMessageType=message_type
                    )
                )
                nodejs_callback_bridge.send_message(error_response)
            except Exception as send_err:
                logger.error(f"Failed to send error response: {str(send_err)}")
    else:
        logger.warning(f"No handler registered for message type: {message_type}")
        try:
            import nodejs_callback_bridge
            
            # Send error response for unknown message type
            error_response = ErrorResponse(
                type="error",
                payload=ErrorPayload(
                    message=f"Unknown message type: {message_type}",
                    originalMessageType=message_type
                )
            )
            nodejs_callback_bridge.send_message(error_response)
        except Exception as send_err:
            logger.error(f"Failed to send error response: {str(send_err)}")