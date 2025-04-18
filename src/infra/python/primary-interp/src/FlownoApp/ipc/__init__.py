"""
IPC (Inter-Process Communication) package for FlownoApp.
"""
# Re-export the core message handler components
from .handler import handle_message
from .context import AppContext