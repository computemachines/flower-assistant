import React, { useRef, useEffect, useState, UIEvent } from "react";
import clsx from "clsx";
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
}

interface Props {
  messages: Message[];
  roleToName?: Record<string, string>;
}

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  position: { left: number };
  onRequestScrollToBottom: () => void;
}

// Custom hook for window resize
const useWindowResize = (callback: () => void) => {
  useEffect(() => {
    // Initial call
    callback();

    window.addEventListener("resize", callback);
    return () => window.removeEventListener("resize", callback);
  }, [callback]);
};

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  isVisible,
  position,
  onRequestScrollToBottom: onScrollToBottom,
}) => {
  if (!isVisible) return null;

  return (
    <button
      className="fixed bottom-18 z-10 rounded-full bg-purple-200 p-3 shadow-xl transition-colors hover:bg-purple-300"
      style={{
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
      aria-label="Scroll to bottom"
      onClick={onScrollToBottom}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </button>
  );
};

// Define props for MessageItem (outside MessageList)
interface MessageItemProps {
  message: Message;
  roleToName: Record<string, string>;
}

// Create the MessageItem component (outside MessageList)
const MessageItem: React.FC<MessageItemProps> = ({ message, roleToName }) => {
  return (
    <div key={message.id} className="mt-2">
      <div
        className={clsx("font-semibold", {
          "text-right": message.role === "user",
        })}
      >
        {roleToName[message.role] || message.role}
      </div>
      <div
        className={clsx(
          "rounded-2xl px-4 py-2 text-gray-700",
          { "rounded-tr-none bg-blue-100": message.role === "user" },
          { "rounded-tl-none bg-purple-100": message.role !== "user" },
        )}
      >
        {message.role === 'assistant'
          ? <ReactMarkdown>{message.content || ""}</ReactMarkdown>
          : message.content
        }
      </div>
    </div>
  );
};

// Correctly define the MessageList component
const MessageList: React.FC<Props> = ({
  messages, // Destructure props correctly
  roleToName = { user: "User", assistant: "Assistant", system: "System" },
}) => {
  // Hooks and state should be declared at the top level of the component function
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [buttonPosition, setButtonPosition] = useState({ left: 0 });

  // Check if scrolled to bottom
  const checkIfAtBottom = React.useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 10;
    setIsAtBottom(atBottom);

    // console.log(
    //   `ScrollTop: ${scrollTop}, ScrollHeight: ${scrollHeight}, ClientHeight: ${clientHeight}, AtBottom: ${atBottom}`,
    // ); // Keep commented out unless debugging
  }, []); // Removed scrollContainerRef from deps as it's a ref

  // Combined function to handle all resize-related updates
  const handleResize = React.useCallback(() => {
    // Update button position
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonLeft = containerRect.left + containerRect.width / 2;
      setButtonPosition({ left: buttonLeft });
    }

    // If we're already at the bottom, stay at the bottom after resize
    if (isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }

    // Check scroll position after resize
    checkIfAtBottom();
  }, [containerRef, checkIfAtBottom, isAtBottom]); // Added missing dependencies

  // Use the combined resize handler
  useWindowResize(handleResize);

  // Handle messages change and initial mount
  useEffect(() => {
    // If we're already at the bottom, scroll to bottom when messages change
    if (isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }

    checkIfAtBottom(); // Check position when messages update
  }, [messages, checkIfAtBottom, isAtBottom]); // Added missing dependencies

  // Handle scroll event
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    checkIfAtBottom();
  };

  // Handle scroll to bottom click
  const handleScrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        ref={scrollContainerRef}
        className="h-screen overflow-y-auto p-2 pb-18" // Ensure padding-bottom accommodates input
        onScroll={handleScroll}
      >
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} roleToName={roleToName} />
        ))}
      </div>
      <ScrollToBottomButton
        isVisible={!isAtBottom}
        position={buttonPosition}
        onRequestScrollToBottom={handleScrollToBottom}
      />
    </div>
  );
};

export default MessageList;
