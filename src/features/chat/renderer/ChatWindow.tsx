import React, { useRef, useEffect } from "react";
import MessageList, { Message } from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

const ChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      window.electron.ElectronFlownoBridge.start();
      // Minimize logging - remove console.log statement
      
      // Register the message listener to receive messages from Python
      const removeListener = window.electron.ElectronFlownoBridge.registerMessageListener((message) => {
        // Remove verbose logging of every received message
        
        if (message.type === "chunk") {
          setMessages((prevMessages) => {
            const existingMessageIndex = prevMessages.findIndex(
              (msg) => msg.id === message.id
            );

            if (existingMessageIndex !== -1) {
              // Update the existing message
              const updatedMessages = [...prevMessages];
              updatedMessages[existingMessageIndex].content = message.content;

              // If the message is final, mark it as complete
              if (message.final) {
                updatedMessages[existingMessageIndex].role = "assistant";
              }

              return updatedMessages;
            } else {
              // Add a new message if it doesn't exist
              return [
                ...prevMessages,
                {
                  id: message.id,
                  content: message.content,
                  role: message.final ? "assistant" : "system", // Temporary role for partial messages
                },
              ];
            }
          });
        }
      });

      // Cleanup function to remove the listener when the component unmounts
      return () => {
        removeListener();
      };
  }, []);

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
                content,
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
                  content
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
