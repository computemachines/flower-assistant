import React from "react";
import { ipcRenderer } from "electron";
// import { IPC_EVENTS } from '@shared/ipc-events';
import MessageList, { Message } from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

const ChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);

  React.useEffect(() => {
    // ipcRenderer.on(IPC_EVENTS.CHAT.RECEIVE, (event, message) => {
    //   setMessages(prev => [...prev, message]);
    // });
  }, []);

  return (
    <div className="flex flex-row">
      <Sidebar className="h-screen min-w-60 border-neutral-400 bg-neutral-50 shadow-xl" />
      <div className="relative flex h-screen w-full flex-col">
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <MessageList messages={messages} />
        </div>
        <div className="absolute right-0 bottom-0 left-0 p-0">
          <MessageInput
            onSendMessage={(message) => {
              const newMessage: Message = {
                id: Date.now().toString(),
                content: message,
                role: "user",
              };
              setMessages((prev) => [...prev, newMessage]);
              window.electron.DummyService.returnSomething().then(
                (response) => {
                  const assistantMessage: Message = {
                    id: Date.now().toString(),
                    content: response,
                    role: "assistant",
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                },
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
