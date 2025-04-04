import React from "react";

import clsx from "clsx";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
}

interface Props {
  messages: Message[];
  roleToName?: Record<string, string>;
}

const MessageList: React.FC<Props> = ({
  messages,
  roleToName = { user: "User", assistant: "Assistant", system: "System" },
}) => {
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div key={msg.id} className="message">
          <div
            className={clsx("font-semibold", {
              "text-right": msg.role === "user",
            })}
          >
            {roleToName[msg.role] || msg.role}
          </div>
          <div
            className={clsx(
              "rounded-2xl bg-purple-100 px-4 py-2 text-gray-700",
              { "rounded-tr-none": msg.role === "user" },
              { "rounded-tl-none": msg.role !== "user" },
            )}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
