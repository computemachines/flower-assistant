interface Window {
  electronAPI: {
    sendMessage: (message: string) => void;
  };
}