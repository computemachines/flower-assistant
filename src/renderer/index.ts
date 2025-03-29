import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatComponent } from './ChatComponent';

const root = createRoot(document.querySelector('.react-root')!);
root.render(React.createElement(ChatComponent));