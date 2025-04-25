"""
Main ChatApp implementation using the Flowno framework.
"""
from dataclasses import dataclass
import logging
import os
import time
from typing import Dict, Callable, Coroutine, Any, TypeVar, final
from typing_extensions import TypeVarTuple, Unpack

from flowno import FlowHDL, AsyncQueue, node
from FlownoApp.nodes.sentencizer import ChunkSentences
import nodejs_callback_bridge

from .messages.domain_types import Message, AppState, ApiConfig
from .messages.encoders import NodeJSMessageJSONEncoder
from .ipc.handler import handle_message
from .ipc.context import AppContext
from .nodes.gui_io import GUIChat, SentenceSpeaker
from .nodes.chat_history import ChatHistory
from .nodes.inference import Inference, ChunkContents

# Set up logging
logging.basicConfig(level=os.environ.get("FLOWNO_LOG_LEVEL", "WARNING"))
logger = logging.getLogger(__name__)

# Initialize the NodeJS bridge JSON encoder
nodejs_callback_bridge.set_json_encoder(NodeJSMessageJSONEncoder())

# ---------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------

Ts = TypeVarTuple("Ts")

def handle_task(flow: FlowHDL, task: Callable[[*Ts], Coroutine[Any, Any, None]]):
    """A partial function that enqueues the task on the event loop."""
    def wrapper(*args: Unpack[Ts]):
        # Enqueue the task on the event loop
        flow.create_task(task(*args))
    return wrapper

# ---------------------------------------------------------------------
# Chat Application
# ---------------------------------------------------------------------

@final
class ChatApp:
    """
    Main chat application using Flowno for the data flow graph.
    
    This class sets up and manages the Flowno graph, connects to the NodeJS
    bridge to communicate with the frontend, and handles incoming IPC messages.
    """
    f: FlowHDL

    def __init__(self):
        """
        Initialize the ChatApp with a flow graph and message handling.
        """
        # Create the prompt queue for receiving messages from the frontend
        self.prompt_queue = AsyncQueue[Message]()
        
        # Initialize application state
        self.app_state = AppState(
            current_chat_id=None,
            active_sessions={},
            api_config=ApiConfig(
                url=os.environ.get("LLM_API_URL", "http://localhost:5000/v1/chat/completions"),
                token=os.environ.get("GROQ_API_KEY", ""),
                model=os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile"),
            )
        )
        
        # Create the Flowno graph
        with FlowHDL() as f:
            # GUIChat receives prompts from queue and sends chunks to the frontend
            f.gui_chat = GUIChat(self.prompt_queue, f.inference)
            
            # Inference consumes message history and produces stream of chunks
            f.inference = Inference(f.history, self.app_state.api_config)
            
            # ChunkContents extracts content strings from chunks
            f.chunk_contents = ChunkContents(f.inference)
            
            # ChatHistory receives prompts and accumulated response content
            f.history = ChatHistory(f.gui_chat, f.chunk_contents)

            f.sentences = ChunkSentences(f.inference)
            f.tts = SentenceSpeaker(f.sentences)
            f.tts.start_speak_task(f)

        # Store the flow graph
        self.f = f
        
        # Create the app context that will be passed to message handlers
        self.app_context = AppContext(
            prompt_queue=self.prompt_queue,
            app_state=self.app_state,
            flow_hdl=self.f
        )
        
        # Register the message listener with the NodeJS bridge
        nodejs_callback_bridge.register_message_listener(
            handle_task(self.f, self.handle_message)
        )
        
        logger.info("ChatApp initialized successfully")

    def run(self):
        """
        Run the Flowno graph until completion.
        """
        logger.info("Starting Flowno graph")
        self.f.run_until_complete()

    async def handle_message(self, message: dict[str, object]):
        """
        Delegate message handling to the central handler.
        
        Args:
            message: The raw message dictionary from the frontend
        """
        try:
            logger.debug(f"Received message: {message.get('type', 'unknown type')}")
            await handle_message(message, self.app_context)
        except Exception as e:
            logger.error(f"Unhandled error in handle_message: {str(e)}")
            # Don't re-raise to avoid crashing the application

# -----------------------------------------------------
# Create a single instance of the app
# -----------------------------------------------------
app = ChatApp()