from dataclasses import dataclass
from typing import Dict, List, Literal, Optional, Any

from ..messages.domain_types import Message

# -----------------------------------------------------------------
# Base IPC Message Structure
# -----------------------------------------------------------------

@dataclass
class IPCMessageBase:
    """Base class for all IPC messages."""
    type: str

# -----------------------------------------------------------------
# Frontend -> Python Messages (Commands & Queries)
# -----------------------------------------------------------------

@dataclass
class NewPromptPayload:
    id: str
    role: Literal["user"]
    content: str

@dataclass
class NewPromptMessage(IPCMessageBase):
    type: Literal["new-prompt"]
    content: NewPromptPayload

@dataclass
class EditMessagePayload:
    messageId: str
    newContent: str

@dataclass
class EditMessageRequest(IPCMessageBase):
    type: Literal["edit-message"]
    payload: EditMessagePayload

@dataclass
class DeleteMessagePayload:
    messageId: str

@dataclass
class DeleteMessageRequest(IPCMessageBase):
    type: Literal["delete-message"]
    payload: DeleteMessagePayload

@dataclass
class LoadChatPayload:
    chatId: str

@dataclass
class LoadChatRequest(IPCMessageBase):
    type: Literal["load-chat"]
    payload: LoadChatPayload

@dataclass
class CreateNewChatRequest(IPCMessageBase):
    type: Literal["create-new-chat"]
    payload: Dict = None  # Empty payload

@dataclass
class ApiConfigPayload:
    url: Optional[str] = None
    token: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

@dataclass
class SetApiConfigRequest(IPCMessageBase):
    type: Literal["set-api-config"]
    payload: ApiConfigPayload

@dataclass
class StopGenerationRequest(IPCMessageBase):
    type: Literal["stop-generation"]
    payload: Dict = None  # Empty payload

@dataclass
class GetChatListRequest(IPCMessageBase):
    type: Literal["get-chat-list"]
    payload: Dict = None  # Empty payload

@dataclass
class GetApiConfigRequest(IPCMessageBase):
    type: Literal["get-api-config"]
    payload: Dict = None  # Empty payload

# -----------------------------------------------------------------
# Python -> Frontend Messages (Responses & Events)
# -----------------------------------------------------------------

@dataclass
class ChatSummary:
    id: str
    name: str
    lastUpdated: str  # ISO format timestamp

@dataclass
class ChatListPayload:
    chats: List[ChatSummary]

@dataclass
class ChatListResponse(IPCMessageBase):
    type: Literal["chat-list"]
    payload: ChatListPayload

@dataclass
class ChatLoadedPayload:
    chatId: str
    messages: List[Message]

@dataclass
class ChatLoadedResponse(IPCMessageBase):
    type: Literal["chat-loaded"]
    payload: ChatLoadedPayload

@dataclass
class ApiConfigResponse(IPCMessageBase):
    type: Literal["api-config"]
    payload: ApiConfigPayload

@dataclass
class MessageDeletedPayload:
    messageId: str

@dataclass
class MessageDeletedResponse(IPCMessageBase):
    type: Literal["message-deleted"]
    payload: MessageDeletedPayload

@dataclass
class GenerationStoppedResponse(IPCMessageBase):
    type: Literal["generation-stopped"]
    payload: Dict = None  # Empty payload

@dataclass
class MessageUpdatedPayload:
    message: Message

@dataclass
class MessageUpdatedResponse(IPCMessageBase):
    type: Literal["message-updated"]
    payload: MessageUpdatedPayload

@dataclass
class AckPayload:
    originalMessageType: str
    success: bool
    message: Optional[str] = None

@dataclass
class AckResponse(IPCMessageBase):
    type: Literal["ack"]
    payload: AckPayload

@dataclass
class ErrorPayload:
    message: str
    originalMessageType: Optional[str] = None

@dataclass
class ErrorResponse(IPCMessageBase):
    type: Literal["error"]
    payload: ErrorPayload

# -----------------------------------------------------------------
# Streaming Response Messages (Already present in the old codebase)
# -----------------------------------------------------------------

@dataclass
class NewResponsePayload:
    id: str
    role: Literal["assistant"]
    content: str

@dataclass
class NewResponseMessage(IPCMessageBase):
    type: Literal["new-response"]
    response: NewResponsePayload

@dataclass
class ChunkedResponse(IPCMessageBase):
    type: Literal["chunk"]
    id: str
    response_id: str
    content: str
    finish_reason: Optional[str] = None