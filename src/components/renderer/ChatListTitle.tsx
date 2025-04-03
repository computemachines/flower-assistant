interface Props {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const ChatListTitle = ({
  selected = false,
  onClick = () => {},
  children,
}: Props) => {
  return (
    <a
      className={`m-2 block rounded-xl px-4 py-2 hover:bg-neutral-300 active:bg-neutral-400 ${selected ? "bg-neutral-200" : "bg-inherit"}`}
      onClick={onClick}
    >
      {children}
    </a>
  );
};

export default ChatListTitle;
