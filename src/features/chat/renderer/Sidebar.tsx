import DropdownHeading from "@components/renderer/DropdownHeading";
import ChatListTitle from "@components/renderer/ChatListTitle";

const Sidebar = ({ className }: { className?: string } = { className: "" }) => {
  return (
    <div className={`relative pt-20 ${className}`}>
      <DropdownHeading className="fixed top-0 left-0 m-2 w-[14rem] rounded-xl bg-white p-4 shadow-lg shadow-gray-400">
        Conversations
      </DropdownHeading>
      <ChatListTitle selected>Hello, World!</ChatListTitle>
      <ChatListTitle>Hello, World!</ChatListTitle>
      <ChatListTitle>Hello, World!</ChatListTitle>
      <ChatListTitle>Hello, World!</ChatListTitle>
    </div>
  );
};

export default Sidebar;
