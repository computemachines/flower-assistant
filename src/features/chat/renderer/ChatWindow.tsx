import React from "react";
// import { IPC_EVENTS } from '@shared/ipc-events';
import MessageList, { Message } from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

const ChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);

  React.useEffect(() => {
    let timerId: NodeJS.Timeout;

    const startAndStopElectronFlow = async () => {
      await window.electron.ElectronFlownoBridge.start((time) => {
        console.log(`tick: ${time}`);
      });
      console.log("Electron Flow started");

      timerId = setTimeout(async () => {
        await window.electron.ElectronFlownoBridge.stop();
        console.log("Electron Flow stopped after 10 seconds");
      }, 10000);
    };

    startAndStopElectronFlow();

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
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
              const response = await window.electron.DummyService.returnSomething();
              const assistantMessage: Message = {
          id: Date.now().toString(),
          content: response,
          role: "assistant",
              };
              setMessages((prev) => [...prev, assistantMessage]);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
