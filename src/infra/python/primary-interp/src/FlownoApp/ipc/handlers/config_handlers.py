"""
Handlers for configuration-related IPC messages.
"""
import logging
from typing import Dict, Any
import nodejs_callback_bridge

from ...messages.domain_types import ApiConfig
from ...messages.ipc_schema import ApiConfigResponse, ApiConfigPayload
from ..context import AppContext  # Import from context.py instead of handler.py

logger = logging.getLogger(__name__)

async def handle_get_api_config(message: Dict[str, Any], context: AppContext) -> None:
    """
    Handle 'get-api-config' messages from the frontend.
    
    Sends the current API configuration to the frontend.
    
    Args:
        message: The raw message dictionary
        context: Application context containing the app state
    """
    try:
        # Get current API config from app state
        api_config = context.app_state.api_config
        
        # Create response payload
        payload = ApiConfigPayload(
            url=api_config.url,
            model=api_config.model,
            temperature=api_config.temperature,
            max_tokens=api_config.max_tokens
        )
        
        # Send response to frontend (don't include token for security)
        response = ApiConfigResponse(
            type="api-config",
            payload=payload
        )
        nodejs_callback_bridge.send_message(response)
        logger.info("Sent API config to frontend")
        
    except Exception as e:
        logger.error(f"Error handling get-api-config: {e}")
        raise

async def handle_set_api_config(message: Dict[str, Any], context: AppContext) -> None:
    """
    Handle 'set-api-config' messages from the frontend.
    
    Updates the API configuration with the values provided.
    
    Args:
        message: The raw message dictionary containing the new config values
        context: Application context containing the app state
    """
    try:
        # Extract the config details
        if "payload" not in message:
            raise ValueError("Missing 'payload' in set-api-config message")
            
        payload = message["payload"]
        
        # Update only the fields that are provided
        if payload.get("url") is not None:
            context.app_state.api_config.url = payload["url"]
            
        if payload.get("token") is not None:
            context.app_state.api_config.token = payload["token"]
            
        if payload.get("model") is not None:
            context.app_state.api_config.model = payload["model"]
            
        if payload.get("temperature") is not None:
            context.app_state.api_config.temperature = float(payload["temperature"])
            
        if payload.get("max_tokens") is not None:
            context.app_state.api_config.max_tokens = int(payload["max_tokens"]) if payload["max_tokens"] else None
            
        logger.info("Updated API configuration")
        
        # Confirm the update by sending the current config back (excluding token)
        await handle_get_api_config(message, context)
        
    except ValueError as e:
        logger.error(f"Invalid value in set-api-config: {e}")
        raise
    except Exception as e:
        logger.error(f"Error handling set-api-config: {e}")
        raise