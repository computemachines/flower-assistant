import React, { useState } from "react";

interface Props {
  onSendMessage: (text: string) => void;
}

const MessageInput: React.FC<Props> = ({ onSendMessage }) => {
  const [messageText, setMessageText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="group relative bottom-0 left-0 w-full p-4"
    >
      <input
        type="text"
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        placeholder="Type a message..."
        className="w-full rounded-xl border border-gray-300 bg-white p-2 pr-12 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        autoComplete="off"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-6 -translate-y-1/2 bg-transparent p-2 text-gray-400 group-focus-within:text-blue-500 hover:text-gray-600 group-focus-within:hover:text-blue-700 focus:text-blue-500 focus:hover:text-blue-700"
        aria-label="Send message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="currentColor"
          className="bi bi-send-arrow-up"
          viewBox="0 0 16 16"
        >
          <path
            fillRule="evenodd"
            d="M15.854.146a.5.5 0 0 1 .11.54l-2.8 7a.5.5 0 1 1-.928-.372l1.895-4.738-7.494 7.494 1.376 2.162a.5.5 0 1 1-.844.537l-1.531-2.407L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM5.93 9.363l7.494-7.494L1.591 6.602z"
          />
          <path
            fillRule="evenodd"
            d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.354-5.354a.5.5 0 0 0-.722.016l-1.149 1.25a.5.5 0 1 0 .737.676l.28-.305V14a.5.5 0 0 0 1 0v-1.793l.396.397a.5.5 0 0 0 .708-.708z"
          />
        </svg>
      </button>
    </form>
  );
};

export default MessageInput;
