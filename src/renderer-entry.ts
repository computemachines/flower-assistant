import React from "react";
import { createRoot } from "react-dom/client";

import "./styles/global.css";
import ChatWindow from "./features/chat/renderer/ChatWindow";

const root = createRoot(document.querySelector(".react-root")!);
root.render(React.createElement(ChatWindow));
