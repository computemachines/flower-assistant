import DropdownHeading, {
  DropdownItem,
} from "@components/renderer/DropdownHeading";
import ChatListTitle from "@components/renderer/ChatListTitle";

interface Conversation {
  id: string;
  title: string;
}

interface SidebarProps {
  className?: string;
  savedConversations?: Conversation[];
  activeConversationId?: string;
  onConversationClick?: (id: string) => void;
  onDeleteAllClick?: () => void;
  onNewChatClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  savedConversations = [],
  activeConversationId,
  onConversationClick,
  onDeleteAllClick,
  onNewChatClick,
}) => {
  return (
    <div className={`relative pt-20 ${className}`}>
      <DropdownHeading
        title="Conversations"
        className="absolute top-0 left-0 m-2 w-[14rem] rounded-xl bg-white p-4 shadow-lg shadow-gray-400"
      >
        <DropdownItem onClick={onDeleteAllClick}>
          Delete All
        </DropdownItem>
        <DropdownItem onClick={onNewChatClick}>
          New Chat
        </DropdownItem>
      </DropdownHeading>
      {savedConversations.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No conversations yet. Start chatting to create one!
        </div>
      ) : (
        savedConversations.map(conversation => (
          <ChatListTitle
            key={conversation.id}
            selected={activeConversationId === conversation.id}
            onClick={() => onConversationClick?.(conversation.id)}
          >
            {conversation.title}
          </ChatListTitle>
        ))
      )}
    </div>
  );
};

export default Sidebar;
