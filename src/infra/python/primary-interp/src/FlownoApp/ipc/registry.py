"""
IPC message registry for handling messages from the frontend.
"""
from typing import Dict, Callable, Awaitable, Any

from ..messages.domain_types import Message, AppState
from ..messages.ipc_schema import NewPromptMessage, EditMessageRequest, DeleteMessageRequest
from ..messages.ipc_schema import LoadChatRequest, CreateNewChatRequest, SetApiConfigRequest
from ..messages.ipc_schema import StopGenerationRequest, GetChatListRequest, GetApiConfigRequest
from ..ipc.handlers.prompt_handlers import handle_new_prompt
from ..ipc.handlers.chat_management_handlers import (
    handle_load_chat, 
    handle_create_new_chat,
    handle_delete_message,
    handle_edit_message
)
from ..ipc.handlers.config_handlers import (
    handle_get_api_config,
    handle_set_api_config
)

# Define the type for handler functions
MessageHandlerType = Callable[[Dict[str, Any], 'AppContext'], Awaitable[None]]

# Registry mapping message types to their handler functions
MESSAGE_HANDLERS: Dict[str, MessageHandlerType] = {
    # Prompt handling
    "new-prompt": handle_new_prompt,
    
    # Chat management
    "load-chat": handle_load_chat,
    "create-new-chat": handle_create_new_chat,
    "delete-message": handle_delete_message,
    "edit-message": handle_edit_message,
    
    # Configuration
    "get-api-config": handle_get_api_config,
    "set-api-config": handle_set_api_config,
    
    # To be implemented in the future
    # "stop-generation": handle_stop_generation,
    # "get-chat-list": handle_get_chat_list,
}