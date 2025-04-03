import React from 'react';

export interface Message {
  id: string;
  text: string;
  user: string;
}

interface Props {
  messages: Message[];
}

const MessageList: React.FC<Props> = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div key={msg.id} className="message">
          <div className="user">{msg.user}</div>
          <div className="text">{msg.text}</div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;