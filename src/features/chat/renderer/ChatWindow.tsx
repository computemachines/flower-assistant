import React, { useRef, useEffect, useState } from "react";
import MessageList, {
  ChunkedMessage,
  CompleteMessage,
  Message,
  MessageChunk,
} from "./MessageList";
import MessageInput from "./MessageInput";
import Sidebar from "./Sidebar";

interface Conversation {
  id: string;
  title: string;
}

const ChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sentenceIds, setSentenceIds] = React.useState<string[]>([]);
  const [messageIdStreamingAudio, setMessageIdStreamingAudio] =
    React.useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationsFetchedRef = useRef(false); // Ref to track if initial fetch happened

  // Effect to start the bridge and attempt initial fetch
  useEffect(() => {
    // Initialize the ElectronFlownoBridge
    console.log("Starting Electron Flowno Bridge...");
    window.electron.ElectronFlownoBridge.start();

    // Attempt to fetch conversations after a short delay
    // This assumes the bridge will likely be ready after 1 second
    const timer = setTimeout(async () => {
      console.log("Attempting initial conversation fetch...");
      try {
        const isRunning = await window.electron.ElectronFlownoBridge.isRunning();
        if (isRunning && !conversationsFetchedRef.current) {
          await fetchConversations();
          conversationsFetchedRef.current = true; // Mark as fetched
        } else if (!isRunning) {
          console.warn("Initial fetch skipped: Bridge not running yet.");
        }
      } catch (error) {
        console.error("Error during initial conversation fetch attempt:", error);
      }
    }, 1000); // 1-second delay

    return () => clearTimeout(timer);
  }, []); // Runs only once on mount

  // Function to fetch conversation list
  const fetchConversations = async () => {
    // No need to check isRunning here as it's called internally or after a check
    try {
      console.log("Fetching conversations...");
      await window.electron.ElectronFlownoBridge.send({
        id: Date.now().toString(),
        type: "get-chat-list",
        payload: null
      });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  // Function to load a conversation
  const loadConversation = async (conversationId: string) => {
    try {
      const isRunning = await window.electron.ElectronFlownoBridge.isRunning();
      if (!isRunning) {
        console.error("Cannot load conversation: Python bridge is not running");
        return;
      }

      setActiveConversationId(conversationId);
      console.log(`Loading conversation ${conversationId}...`);
      await window.electron.ElectronFlownoBridge.send({
        id: Date.now().toString(),
        type: "load-chat",
        payload: {
          chatId: conversationId
        }
      });
    } catch (error) {
      console.error(`Failed to load conversation ${conversationId}:`, error);
    }
  };

  // Function to delete all conversations
  const deleteAllConversations = async () => {
    try {
      const isRunning = await window.electron.ElectronFlownoBridge.isRunning();
      if (!isRunning) {
        console.error("Cannot delete conversations: Python bridge is not running");
        return;
      }

      console.log("Deleting all conversations...");
      await window.electron.ElectronFlownoBridge.send({
        id: Date.now().toString(),
        type: "delete-all-chats",
        payload: null
      });

      // Clear local state
      setConversations([]);
      setActiveConversationId(undefined);
      setMessages([]);
    } catch (error) {
      console.error("Failed to delete all conversations:", error);
    }
  };

  // Function to create a new chat
  const createNewChat = async () => {
    try {
      const isRunning = await window.electron.ElectronFlownoBridge.isRunning();
      if (!isRunning) {
        console.error("Cannot create new chat: Python bridge is not running");
        return;
      }

      console.log("Creating new chat...");
      await window.electron.ElectronFlownoBridge.send({
        id: Date.now().toString(),
        type: "create-new-chat",
        payload: null
      });
      // Chat list will be refreshed via the response handler
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // Register the message listener to receive messages from Python
  useEffect(() => {
    const removeListener =
      window.electron.ElectronFlownoBridge.registerMessageListener(
        (message) => {
          console.log("Received message from Python:", message.type);

          if (message.type === "sentence") {
            const chunkIds: string[] = message.payload.chunk_ids;
            setSentenceIds(chunkIds);
            setMessages((prevMessages) => {
              const parent = prevMessages.find(
                (msg) =>
                  msg.kind === "chunked-message" &&
                  msg.contents.some((c) => chunkIds.includes(c.id)),
              );
              if (parent) setMessageIdStreamingAudio(parent.id);
              return prevMessages;
            });
            return; // Exit without modifying message list
          }

          if (message.type === "new-response") {
            console.log("Creating new response:", message); // Debug new response creation
            const newResponse: ChunkedMessage = {
              kind: "chunked-message",
              id: message.response?.id || message.id,
              contents: [], // Initialize with empty contents array - don't add content yet
              role: "assistant",
              isComplete: false,
            };
            console.log("Created new chunked message:", newResponse); // Debug created message
            setMessages((prevMessages) => [...prevMessages, newResponse]);
            return;
          }

          if (message.type === "chunk") {
            console.log("Processing chunk:", message); // Debug incoming chunk
            setMessages((prevMessages) => {
              const assistantMessageIndex = prevMessages.findIndex(
                (msg) => msg.id === message.response_id, // Find message using response_id
              );

              if (assistantMessageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                const currentMessage = updatedMessages[assistantMessageIndex];

                if (currentMessage.kind === "chunked-message") {
                  let chunkContent = "";
                  if (typeof message.content === "string") {
                    chunkContent = message.content;
                  } else if (
                    message.content === null ||
                    message.content === undefined
                  ) {
                    chunkContent = "";
                  } else {
                    try {
                      chunkContent = JSON.stringify(message.content);
                    } catch (e) {
                      chunkContent = String(message.content);
                    }
                  }

                  const newChunk: MessageChunk = {
                    id: message.id,
                    content: chunkContent,
                    finish_reason: message.finish_reason || null,
                  };

                  console.log("Adding chunk:", newChunk); // Debug the new chunk

                  updatedMessages[assistantMessageIndex] = {
                    ...currentMessage,
                    contents: [...currentMessage.contents, newChunk],
                    isComplete: !!message.finish_reason,
                  };

                  console.log(
                    "Updated message:",
                    updatedMessages[assistantMessageIndex],
                  ); // Debug updated message
                }

                return updatedMessages;
              }

              console.warn(
                "Received chunk for unknown message ID:",
                message.response_id,
              );
              return prevMessages;
            });
            return;
          }

          // Handle chat list response
          if (message.type === "chat-list" && message.payload?.chats) {
            console.log("Received chat list:", message.payload.chats);
            // Convert from API format to our local format
            const conversationList = message.payload.chats.map(chat => ({
              id: chat.id,
              title: chat.name
            }));
            setConversations(conversationList);
            conversationsFetchedRef.current = true; // Mark as fetched if received via listener
            return;
          }

          // Handle chat loaded response
          if (message.type === "chat-loaded" && message.payload) {
            console.log("Chat loaded:", message.payload);
            setMessages(message.payload.messages);
            setActiveConversationId(message.payload.chatId);
            return;
          }
        },
      );

    return () => {
      removeListener();
    };
  }, []); // Runs only once on mount

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-row">
      <Sidebar
        className="h-screen min-w-60 border-neutral-400 bg-neutral-50 shadow-xl"
        savedConversations={conversations}
        activeConversationId={activeConversationId}
        onConversationClick={loadConversation}
        onDeleteAllClick={deleteAllConversations}
        onNewChatClick={createNewChat}
      />
      <div className="relative flex w-full flex-col">
        <MessageList
          messages={messages}
          sentenceIds={sentenceIds}
          messageIdStreamingAudio={messageIdStreamingAudio}
        />
        <div className="absolute right-0 bottom-0 left-0 p-0">
          <MessageInput
            ref={inputRef}
            onSendMessage={async (content) => {
              try {
                const isRunning = await window.electron.ElectronFlownoBridge.isRunning();
                if (!isRunning) {
                  console.error("Cannot send message: Python bridge is not running");
                  return;
                }

                const messageId = Date.now().toString();

                // Create and add user message to UI
                const newMessage: CompleteMessage = {
                  kind: "complete-message",
                  id: messageId,
                  content, // Use shorthand property
                  role: "user",
                };
                setMessages((prev) => [...prev, newMessage]);

                console.log("Sending new prompt to Python...");
                // send to Python
                await window.electron.ElectronFlownoBridge.send({
                  id: messageId,
                  type: "new-prompt",
                  content: {
                    id: messageId,
                    role: "user",
                    content,
                  },
                });
              } catch (error) {
                console.error("Failed to send message:", error);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
