"""
Context object for IPC message handlers.
"""
from dataclasses import dataclass
from typing import Dict, Any

from flowno import FlowHDL, AsyncQueue
from ..messages.domain_types import Message, AppState

import logging

logger = logging.getLogger(__name__)

@dataclass
class AppContext:
    """
    Context object passed to message handlers.
    
    Contains references to shared resources that handlers need to access.
    """
    prompt_queue: AsyncQueue[Message]
    app_state: AppState
    flow_hdl: FlowHDL