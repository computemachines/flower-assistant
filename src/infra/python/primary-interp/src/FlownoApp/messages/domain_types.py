from dataclasses import dataclass, field
from typing import Dict, List, Literal

@dataclass
class Message:
    """Represents a single message in a chat."""
    id: str
    role: Literal["user", "assistant", "system"]
    content: str

# Alias for a list of Message objects
Messages = List[Message]

@dataclass
class ChatSession:
    """Represents a single conversation thread."""
    id: str
    name: str
    messages: Messages = field(default_factory=list)
    
    def add_system_message(self, content: str) -> None:
        """Add a system message to the conversation."""
        self.messages.append(Message(f"system-{len(self.messages)}", "system", content))
    
    def add_user_message(self, id: str, content: str) -> None:
        """Add a user message to the conversation."""
        self.messages.append(Message(id, "user", content))
    
    def add_assistant_message(self, id: str, content: str) -> None:
        """Add an assistant message to the conversation."""
        self.messages.append(Message(id, "assistant", content))

@dataclass
class ApiConfig:
    """Holds the configuration for the LLM API."""
    url: str = "http://localhost:5000/v1/chat/completions"
    token: str = ""
    model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.7
    max_tokens: int | None = None

@dataclass
class AppState:
    """A container for the main application state."""
    current_chat_id: str | None = None
    active_sessions: Dict[str, ChatSession] = field(default_factory=dict)
    api_config: ApiConfig = field(default_factory=ApiConfig)