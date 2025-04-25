"""JSON encoders for IPC and API communication."""
from json import JSONEncoder
import logging
from typing import Any
from typing_extensions import override

from ..messages.domain_types import Message
from ..messages.ipc_schema import ChunkedResponse, NewResponseMessage

logger = logging.getLogger(__name__)

class MessageJSONEncoder(JSONEncoder):
    """JSON encoder for chat messages sent to the inference API."""
    @override
    def default(self, o: Any):
        if isinstance(o, Message):
            # Only include role and content for API compatibility
            return {"role": o.role, "content": o.content}
        # Log unexpected types
        logger.error(f"MessageJSONEncoder encountered unexpected type: {type(o).__name__} - Object: {o!r}")
        return super().default(o)

## TODO: Add decoders and add a set_json_decoder method to the NodeJS bridge

class NodeJSMessageJSONEncoder(JSONEncoder):
    """JSON encoder for messages sent to the frontend via the NodeJS bridge."""
    @override
    def default(self, o: Any):
        if isinstance(o, ChunkedResponse):
            result = {
                "type": o.type,
                "id": o.id,
                "response_id": o.response_id,
                "content": o.content,
            }
            if o.finish_reason is not None:
                result["finish_reason"] = o.finish_reason
            return result
        elif isinstance(o, Message):
            return {
                "id": o.id,
                "role": o.role,
                "content": o.content,
            }
        elif isinstance(o, NewResponseMessage):
            return {
                "type": o.type,
                "response": o.response,
            }
        
        # Fallback for other types of IPC messages
        if hasattr(o, "__dict__"):
            return o.__dict__
            
        return super().default(o)