import React from "react";
// import { IPC_EVENTS } from '@shared/ipc-events';
import MessageList, { Message } from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

const ChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);

  React.useEffect(() => {
      window.electron.ElectronFlownoBridge.start();
      console.log("Electron Flow started");

      // Register the message listener to receive messages from Python
      const removeListener = window.electron.ElectronFlownoBridge.registerMessageListener((message) => {
        console.log("Received message from Python:", message);

        setMessages((prevMessages) => {
          const existingMessageIndex = prevMessages.findIndex(
            (msg) => msg.id === message.response_id.toString()
          );

          if (existingMessageIndex !== -1) {
            // Update the existing message
            const updatedMessages = [...prevMessages];
            updatedMessages[existingMessageIndex].content += message.content;

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
                id: message.response_id.toString(),
                content: message.content,
                role: message.final ? "assistant" : "system", // Temporary role for partial messages
              },
            ];
          }
        });
      });

      // Cleanup function to remove the listener when the component unmounts
      return () => {
        removeListener();
      };
  }, []);

  return (
    <div className="flex flex-row">
      <Sidebar className="h-screen min-w-60 border-neutral-400 bg-neutral-50 shadow-xl" />
      <div className="relative flex w-full flex-col">
        <MessageList messages={messages} />
        <div className="absolute right-0 bottom-0 left-0 p-0">
          <MessageInput
            onSendMessage={async (message) => {
              const newMessage: Message = {
                id: Date.now().toString(),
                content: message,
                role: "user",
              };
              setMessages((prev) => [...prev, newMessage]);

              await window.electron.ElectronFlownoBridge.send(newMessage);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
