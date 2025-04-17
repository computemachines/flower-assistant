from dataclasses import dataclass
from typing import Literal, overload, Any, TypeGuard

# Define the message structure.
@dataclass
class Message:
    id: str
    role: Literal["system", "user", "assistant"]
    content: str

@dataclass
class RendererMessageBase:
    type: str

@dataclass
class NewPromptMessage(RendererMessageBase):
    type: Literal["new-prompt"]
    content: Message

@dataclass
class EditMessage(RendererMessageBase):
    type: Literal["edit-message"]
    content: Message  # The message to edit

@dataclass
class GetHistoryMessage(RendererMessageBase):
    type: Literal["get-history"]

@dataclass
class DeleteMessage(RendererMessageBase):
    type: Literal["delete-message"]
    id: str  # The id of the message to delete

RendererMessage = NewPromptMessage | EditMessage | GetHistoryMessage | DeleteMessage

# Overloaded function definitions for creating RendererMessage
@overload
def create_renderer_message(type: Literal["new-prompt"], content: str, id: str) -> NewPromptMessage: ...

@overload
def create_renderer_message(type: Literal["edit-message"], content: Message, id: str) -> EditMessage: ...

@overload
def create_renderer_message(type: Literal["get-history"], content: None, id: str) -> GetHistoryMessage: ...

@overload
def create_renderer_message(type: Literal["delete-message"], content: str, id: str) -> DeleteMessage: ...

def create_renderer_message(type: str, content: Any, id: str) -> RendererMessage:
    if type == "new-prompt":
        return NewPromptMessage(type=type, content=content, id=id)
    elif type == "edit-message":
        return EditMessage(type=type, content=content, id=id)
    elif type == "get-history":
        return GetHistoryMessage(type=type, content=content, id=id)
    elif type == "delete-message":
        return DeleteMessage(type=type, content=content, id=id)
    else:
        raise ValueError(f"Unknown message type: {type}")

class Discriminator:
    @staticmethod
    def is_new_prompt_message(msg: RendererMessageBase) -> TypeGuard[NewPromptMessage]:
        return msg.type == "new-prompt"

    @staticmethod
    def is_edit_message(msg: RendererMessageBase) -> TypeGuard[EditMessage]:
        return msg.type == "edit-message"

    @staticmethod
    def is_get_history_message(msg: RendererMessageBase) -> TypeGuard[GetHistoryMessage]:
        return msg.type == "get-history"

    @staticmethod
    def is_delete_message(msg: RendererMessageBase) -> TypeGuard[DeleteMessage]:
        return msg.type == "delete-message"
