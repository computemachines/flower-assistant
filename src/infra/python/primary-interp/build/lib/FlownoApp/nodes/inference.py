"""Inference and response processing nodes."""
from collections.abc import AsyncGenerator
from flowno import node, Stream
import logging
import time
import os
import nodejs_callback_bridge

from flowno.io import HttpClient, Headers
from flowno.io.http_client import HTTPException, streaming_response_is_ok

from ..messages.domain_types import Message, Messages, ApiConfig
from ..messages.ipc_schema import ChunkedResponse, NewResponseMessage
from ..messages.encoders import MessageJSONEncoder

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------

def new_id(prefix: str) -> str:
    """Generate a new unique ID with a prefix."""
    return f"{prefix}-{int(time.time() * 1000)}"  # Convert to milliseconds


def create_blank_response():
    """Create and send a blank response placeholder to the frontend."""
    new_response_id = new_id("response")
    message = NewResponseMessage(
        type="new-response",
        response=Message(
            id=new_response_id,
            role="assistant",
            content="",
        ),
    )
    nodejs_callback_bridge.send_message(message)
    return new_response_id


# ---------------------------------------------------------------------
# API Client Setup
# ---------------------------------------------------------------------

# Default API configuration
DEFAULT_API_URL = "http://localhost:5000/v1/chat/completions"
DEFAULT_API_TOKEN = os.environ.get("GROQ_API_KEY", "")

# HTTP client setup
headers = Headers()
headers.set("Authorization", f"Bearer {DEFAULT_API_TOKEN}")

client = HttpClient(headers=headers)
client.json_encoder = MessageJSONEncoder()


# ---------------------------------------------------------------------
# Inference Node
# ---------------------------------------------------------------------

@node
async def Inference(messages: Messages, api_config: ApiConfig = None) -> AsyncGenerator[ChunkedResponse, None]:
    """
    Calls the LLM API with the message history and streams the chunked responses.
    
    Args:
        messages: The list of messages in the conversation
        api_config: Optional API configuration (uses default if None)
        
    Yields:
        ChunkedResponse: Chunks of the AI's response as they arrive
    """
    # Use provided API config or default
    api_url = api_config.url if api_config else DEFAULT_API_URL
    api_model = api_config.model if api_config else "llama-3.3-70b-versatile"
    
    # Set the API token in headers if provided
    if api_config and api_config.token:
        headers.set("Authorization", f"Bearer {api_config.token}")
        # Create a blank response placeholder for the frontend first
    new_response_id = create_blank_response()
    logger.info(f"Created blank response with ID: {new_response_id}")

    try:
        # Make the API request
        response = await client.stream_post(
            api_url,
            json={
                "messages": messages,
                "model": api_model,
                "stream": True,
                # Add additional parameters if provided in api_config
                **({"temperature": api_config.temperature} if api_config and api_config.temperature is not None else {}),
                **({"max_tokens": api_config.max_tokens} if api_config and api_config.max_tokens is not None else {}),
            },
        )

        # Check if the response is valid
        if not streaming_response_is_ok(response):
            logger.error(f"API response error: {response.status}")
            error_message = response.body
            
            ## TODO: Send a more user-friendly error message to the frontend

            # Yield an error chunk
            yield ChunkedResponse(
                type="chunk",
                id=new_id("error-chunk"),
                response_id=new_response_id,
                content=f"\n\n**{error_message}**",
                finish_reason="error"
            )
            raise HTTPException(response.status, error_message)

        # Process the streaming response
        async for response_stream_json in response.body:
            try:
                # Basic validation of the expected structure
                if not isinstance(response_stream_json, dict) or "choices" not in response_stream_json:
                    logger.warning(f"Unexpected stream item format: {response_stream_json}")
                    continue

                choice = response_stream_json["choices"][0]
                delta = choice.get("delta", {})
                chunk_content = delta.get("content", "")  # Default to empty string if None
                finish_reason = choice.get("finish_reason")

                # Create and yield a chunk response
                chunk_response = ChunkedResponse(
                    type="chunk",
                    id=new_id("chunk"),
                    response_id=new_response_id,
                    content=chunk_content,
                    finish_reason=finish_reason
                )
                
                # Only log if it's the final chunk or has content
                if finish_reason or chunk_content:
                    logger.debug(f"Yielding chunk: content_length={len(chunk_content)}, finish_reason={finish_reason}")
                
                yield chunk_response

            except (KeyError, IndexError, TypeError) as e:
                logger.error(f"Error processing stream item: {e} - Item: {response_stream_json}")
                continue  # Skip this item and try the next one
            except Exception as e:
                logger.error(f"Unexpected error processing stream: {e}")
                raise  # Re-raise unexpected errors

    except HTTPException as e:
        # Already handled above with custom error chunk
        logger.error(f"HTTP Exception during API call: {e}")
    except Exception as e:
        # Handle any other exceptions
        logger.error(f"General Exception during API call: {e}")
        ## TODO: Send a more user-friendly error message to the frontend
        yield ChunkedResponse(
            type="chunk",
            id=new_id("error-chunk"),
            response_id=new_response_id,
            content=f"\n\n**An unexpected error occurred: {str(e)}**",
            finish_reason="error"
        )
        raise


# ---------------------------------------------------------------------
# Processing Nodes
# ---------------------------------------------------------------------

@node(stream_in=["chunks"])
async def ChunkContents(chunks: Stream[ChunkedResponse]):
    """
    Extracts the content from each chunk for accumulation.
    
    This node takes a stream of ChunkedResponse objects and yields only
    the content strings, allowing Flowno to automatically accumulate them
    into a single string for nodes that expect a string instead of a stream.
    
    Args:
        chunks: Stream of ChunkedResponse objects
        
    Yields:
        str: The content from each chunk
    """
    async for chunk in chunks:
        if chunk.content:  # Only yield non-empty content
            yield chunk.content