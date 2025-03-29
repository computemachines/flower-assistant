import React, { useState } from 'react';

interface Message {
  text: string;
  isUser: boolean;
}

declare global {
  interface Window {
    electronAPI: {
      sendMessage: (message: string) => void;
    };
  }
}

export function ChatComponent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        setMessages([...messages, { text: input, isUser: true }]);
        window.electronAPI.sendMessage(input);
        setInput('');
      }
    }
  };

  return (
    <div>
      <div style={{ padding: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 'bold' }}>
              {msg.isUser ? 'You' : 'AI'}:
            </span>{' '}
            {msg.text}
          </div>
        ))}
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        style={{ width: '100%', resize: 'none', padding: 8 }}
      />
    </div>
  );
}