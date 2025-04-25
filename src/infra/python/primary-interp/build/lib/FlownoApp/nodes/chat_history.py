from flowno import node
import logging

from ..messages.domain_types import Message, Messages

logger = logging.getLogger(__name__)

@node
class ChatHistory:
    """
    Maintains the chat history for the current conversation.
    
    This stateful node stores the history of messages and handles adding
    new user prompts and assistant responses to the history.

    This is a very simple way to get a linear history of messages. In
    the future, I'm going to replace this with something that extracts
    the relevant context and messages from the ChatSession object.
    """
    # Initialize with a system message
    messages: Messages = [Message("system-0", "system", "You are a helpful assistant.")]

    async def call(self, new_prompt: Message, last_response: str = "") -> Messages:
        """
        Updates the chat history with a new prompt and the previous response.
        
        Args:
            new_prompt: The new user message to add to history
            last_response: The string content of the assistant's response (accumulated from chunks)
            
        Returns:
            Messages: The updated list of all messages in the conversation
        """
        # Validate that last_response is a string (it should be accumulated from chunks)
        if type(last_response) is not str:
            logger.error(f"Expected last_response to be a string, got {type(last_response).__name__}")
            raise TypeError(
                f"Expected last_response to be a string, got {type(last_response).__name__}"
            )
            
        # If we have a response from the previous turn, add it to history
        if last_response:
            # Create a response ID based on the previous message
            assistant_response_id = f"{new_prompt.id}-resp"
            
            # Check if this response ID already exists to prevent duplicates 
            # if the node reruns unexpectedly
            if not any(msg.id == assistant_response_id for msg in self.messages):
                self.messages.append(
                    Message(assistant_response_id, "assistant", last_response)
                )
                logger.debug(f"Added assistant response: {assistant_response_id}")
            else:
                logger.warning(f"Duplicate assistant response ID detected: {assistant_response_id}")
                
        # Add the new prompt to history if it doesn't already exist
        if not any(msg.id == new_prompt.id for msg in self.messages):
            self.messages.append(new_prompt)
            logger.debug(f"Added user prompt: {new_prompt.id}")
        else:
            logger.warning(f"Duplicate prompt ID detected: {new_prompt.id}")

        # Return a copy to avoid potential mutation issues if the list is held elsewhere
        return list(self.messages)