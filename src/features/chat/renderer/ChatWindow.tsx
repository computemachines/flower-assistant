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
        // Add the message to the chat
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: message,
          role: "assistant",
        };
        setMessages((prev) => [...prev, assistantMessage]);
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
              await window.electron.ElectronFlownoBridge.send(message);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
