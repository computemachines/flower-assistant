import React, { useRef, useEffect } from "react";
import MessageList, { Message } from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

const ChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      window.electron.ElectronFlownoBridge.start();
      
      // Register the message listener to receive messages from Python
      const removeListener = window.electron.ElectronFlownoBridge.registerMessageListener((message) => {
        
        setMessages((prevMessages) => {
          if (message.type === "new-response") {
            // Add a new, incomplete assistant message placeholder
            const newAssistantMessage: Message = {
              id: message.response.id, // Use the ID from the response object
              role: "assistant",
              content: "", // Start with empty content
              // Add a flag if needed, e.g., isComplete: false
            };
            // Avoid adding duplicates if the message already exists
            if (!prevMessages.some(msg => msg.id === newAssistantMessage.id)) {
              return [...prevMessages, newAssistantMessage];
            }
            return prevMessages;
          } else if (message.type === "chunk") {
            const assistantMessageIndex = prevMessages.findIndex(
              (msg) => msg.id === message.response_id // Find message using response_id
            );
  
            if (assistantMessageIndex !== -1) {
              const updatedMessages = [...prevMessages];
              const currentMessage = updatedMessages[assistantMessageIndex];
              
              // Append new content chunk
              // Handle potential empty initial chunk
              const newContent = (currentMessage.content || "") + (message.content || "");
              updatedMessages[assistantMessageIndex] = {
                ...currentMessage,
                content: newContent,
                // Optionally update completion status based on finish_reason
                // role: message.finish_reason ? "assistant" : "assistant", // Role is always assistant
                // isComplete: !!message.finish_reason 
              };
              
              // If the chunk indicates completion and content is empty, 
              // consider removing the placeholder or handling it appropriately.
              // Example: Filter out the empty completed message
              // if (message.finish_reason && newContent === "") {
              //    return updatedMessages.filter((_, index) => index !== assistantMessageIndex);
              // }
  
              return updatedMessages;
            }
            // If no corresponding 'new-response' was found (should not happen ideally), 
            // potentially log an error or ignore the chunk.
            console.warn("Received chunk for unknown message ID:", message.response_id);
            return prevMessages; 
          }
          // Handle other message types if necessary
          return prevMessages;
        });
      });

      // Cleanup function to remove the listener when the component unmounts
      return () => {
        removeListener();
      };
  }, []); // <-- Ensure this useEffect hook is properly closed

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-row">
      <Sidebar className="h-screen min-w-60 border-neutral-400 bg-neutral-50 shadow-xl" />
      <div className="relative flex w-full flex-col">
        <MessageList messages={messages} />
        <div className="absolute right-0 bottom-0 left-0 p-0">
          <MessageInput
            ref={inputRef}
            onSendMessage={async (content) => {
              const messageId = Date.now().toString();
              
              // Create and add user message to UI
              const newMessage: Message = {
                id: messageId,
                content, // Use shorthand property
                role: "user",
              };
              setMessages((prev) => [...prev, newMessage]);

              // Send properly formatted message to Python backend
              await window.electron.ElectronFlownoBridge.send({
                id: messageId,
                type: "new-prompt",
                content: {
                  id: messageId,
                  role: "user",
                  content // Use shorthand property
                }
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
