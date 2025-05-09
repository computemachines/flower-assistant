"""
IPC message registry for handling messages from the frontend.
"""
from collections.abc import Awaitable
from typing import Callable, Any

from ..messages.domain_types import Message, AppState
from ..messages.ipc_schema import (
    NewPromptMessage, 
    EditMessageRequest, 
    DeleteMessageRequest,
    LoadChatRequest, 
    CreateNewChatRequest, 
    SetApiConfigRequest,
    StopGenerationRequest, 
    GetChatListRequest, 
    GetApiConfigRequest, 
    SentenceDoneRequest,
    DeleteAllChatsRequest
)
from ..ipc.handlers.prompt_handlers import handle_new_prompt
from ..ipc.handlers.chat_management_handlers import (
    handle_load_chat, 
    handle_create_new_chat,
    handle_delete_message,
    handle_edit_message,
    handle_get_chat_list,
    handle_delete_all_chats
)
from ..ipc.handlers.config_handlers import (
    handle_get_api_config,
    handle_set_api_config
)
from ..ipc.handlers.sentence_handlers import handle_sentence_done

# Define the type for handler functions
MessageHandlerType = Callable[[dict[str, Any], 'AppContext'], Awaitable[None]]

# Registry mapping message types to their handler functions
MESSAGE_HANDLERS: dict[str, MessageHandlerType] = {
    # Prompt handling
    "new-prompt": handle_new_prompt,
    
    # Chat management
    "load-chat": handle_load_chat,
    "create-new-chat": handle_create_new_chat,
    "delete-message": handle_delete_message,
    "edit-message": handle_edit_message,
    "get-chat-list": handle_get_chat_list,
    "delete-all-chats": handle_delete_all_chats,
    
    # Configuration
    "get-api-config": handle_get_api_config,
    "set-api-config": handle_set_api_config,
    
    # TTS sentence playback
    "sentence-done": handle_sentence_done,
    
    # To be implemented in the future
    # "stop-generation": handle_stop_generation,
}