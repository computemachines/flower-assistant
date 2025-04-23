"""
Handlers for chat management IPC messages.
"""
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List

import nodejs_callback_bridge

from ...messages.domain_types import Message, ChatSession
from ...messages.ipc_schema import ChatListResponse, ChatListPayload, ChatSummary, AllChatsDeletedResponse, ChatLoadedResponse, ChatLoadedPayload
from ..context import AppContext  # Import from context.py instead of handler.py

logger = logging.getLogger(__name__)

async def handle_load_chat(message: dict[str, Any], context: AppContext) -> None:
    """
    Handle 'load-chat' messages from the frontend.
    
    Args:
        message: The raw message dictionary containing the chat ID to load
        context: Application context
    """
    try:
        # Extract chat ID from message
        chat_id = message.get("payload", {}).get("chatId")
        if not chat_id:
            logger.error("Missing chat ID in load-chat request")
            return
            
        # Placeholder for retrieving chat from storage
        # In a real implementation, we would load the chat from a database
        # For now, we'll create a mock session if it doesn't exist
        if chat_id not in context.app_state.active_sessions:
            # Create a mock session for demonstration
            context.app_state.active_sessions[chat_id] = ChatSession(
                id=chat_id,
                name=f"Chat {chat_id[:8]}",
                messages=[]
            )
            
        # Set as current chat
        context.app_state.current_chat_id = chat_id
        session = context.app_state.active_sessions[chat_id]
        
        # Send chat-loaded message back to frontend
        response = ChatLoadedResponse(
            type="chat-loaded",
            payload=ChatLoadedPayload(
                chatId=chat_id,
                messages=session.messages
            )
        )
        nodejs_callback_bridge.send_message(response)
        logger.info(f"Loaded chat: {chat_id}")
        
    except Exception as e:
        logger.error(f"Error handling load-chat: {str(e)}")

async def handle_create_new_chat(message: dict[str, Any], context: AppContext) -> None:
    """
    Handle 'create-new-chat' messages from the frontend.
    
    Args:
        message: The raw message dictionary
        context: Application context
    """
    try:
        # Create a unique ID for the new chat
        chat_id = str(uuid.uuid4())
        
        # Create a new ChatSession
        new_chat = ChatSession(
            id=chat_id,
            name=f"New Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            messages=[]
        )
        
        # Store in active sessions
        context.app_state.active_sessions[chat_id] = new_chat
        
        # Make it the current chat
        context.app_state.current_chat_id = chat_id
        
        # Send chat-loaded message to frontend
        response = ChatLoadedResponse(
            type="chat-loaded",
            payload=ChatLoadedPayload(
                chatId=chat_id,
                messages=[]
            )
        )
        nodejs_callback_bridge.send_message(response)
        
        # Also refresh the chat list
        await handle_get_chat_list(message, context)
        
        logger.info(f"Created new chat: {chat_id}")
        
    except Exception as e:
        logger.error(f"Error handling create-new-chat: {str(e)}")

async def handle_delete_message(message: dict[str, Any], context: AppContext) -> None:
    """
    Handle 'delete-message' messages from the frontend.
    
    Args:
        message: The raw message dictionary containing the message ID to delete
        context: Application context
    """
    # This is a stub implementation that will be expanded later
    logger.info("Delete message request received (stub implementation)")
    # Implementation will involve:
    # 1. Extract message ID from payload
    # 2. Find and remove the message from current chat
    # 3. Send message-deleted confirmation to frontend

async def handle_edit_message(message: dict[str, Any], context: AppContext) -> None:
    """
    Handle 'edit-message' messages from the frontend.
    
    Args:
        message: The raw message dictionary containing the message ID and new content
        context: Application context
    """
    # This is a stub implementation that will be expanded later
    logger.info("Edit message request received (stub implementation)")
    # Implementation will involve:
    # 1. Extract message ID and new content from payload
    # 2. Find and update the message in current chat
    # 3. Send message-updated confirmation to frontend

async def handle_get_chat_list(message: dict[str, Any], context: AppContext) -> None:
    """
    Handle 'get-chat-list' messages from the frontend.
    
    Args:
        message: The raw message dictionary
        context: Application context
    """
    try:
        # Build the list of chat summaries
        chat_summaries = []
        for session_id, session in context.app_state.active_sessions.items():
            chat_summaries.append(
                ChatSummary(
                    id=session.id,
                    name=session.name,
                    lastUpdated=datetime.now().isoformat()  # In a real implementation, this would be stored in the session
                )
            )
        
        # Sort chats by last updated timestamp (newest first)
        # In this stub implementation, we'll just use the order they were added
        
        # Create the response payload
        response = ChatListResponse(
            type="chat-list",
            payload=ChatListPayload(
                chats=chat_summaries
            )
        )
        
        # Send the response
        nodejs_callback_bridge.send_message(response)
        logger.info(f"Sent chat list with {len(chat_summaries)} chats")
        
    except Exception as e:
        logger.error(f"Error handling get-chat-list: {str(e)}")

async def handle_delete_all_chats(message: dict[str, Any], context: AppContext) -> None:
    """
    Handle 'delete-all-chats' messages from the frontend.
    
    Args:
        message: The raw message dictionary
        context: Application context
    """
    try:
        # Clear all active sessions
        context.app_state.active_sessions = {}
        
        # Clear current chat ID
        context.app_state.current_chat_id = None
        
        # Send confirmation response
        response = AllChatsDeletedResponse(
            type="all-chats-deleted",
            payload=None
        )
        nodejs_callback_bridge.send_message(response)
        
        logger.info("Deleted all chats")
        
    except Exception as e:
        logger.error(f"Error handling delete-all-chats: {str(e)}")