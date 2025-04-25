/**
 * PythonMessageService.ts
 * A service for sending typed messages to the Python backend using the message schemas.
 */

import { 
  ApiConfig, 
  ChatListResponse,
  ChatLoadedResponse,
  IPCMessage,
  isMessageOfType,
  MessageFactory
} from '../ipc/MessageSchemas';

/**
 * A service that provides a typed interface for sending messages to and receiving 
 * responses from the Python backend.
 */
export class PythonMessageService {
  /**
   * Registers a callback to receive messages from Python.
   * @param callback Function to call when messages are received from Python
   * @returns A function to remove the listener
   */
  registerMessageListener(callback: (message: IPCMessage) => void): () => void {
    return window.electron.ElectronFlownoBridge.registerMessageListener((rawMessage: any) => {
      // rawMessage is already parsed from JSON by the bridge
      callback(rawMessage as IPCMessage);
    });
  }

  /**
   * Sends a new user prompt to Python.
   * @param id Message ID
   * @param content Message content
   * @returns Promise that resolves when the message is sent
   */
  async sendPrompt(id: string, content: string): Promise<void> {
    const message = MessageFactory.createNewPrompt(id, content);
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Loads a chat by ID.
   * @param chatId ID of the chat to load
   * @returns Promise that resolves when the message is sent
   */
  async loadChat(chatId: string): Promise<void> {
    const message = MessageFactory.createLoadChat(chatId);
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Creates a new chat.
   * @returns Promise that resolves when the message is sent
   */
  async createNewChat(): Promise<void> {
    const message = MessageFactory.createNewChat();
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Gets the list of available chats.
   * @returns Promise that resolves when the message is sent
   */
  async getChatList(): Promise<void> {
    const message = MessageFactory.createGetChatList();
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Stops the current generation.
   * @returns Promise that resolves when the message is sent
   */
  async stopGeneration(): Promise<void> {
    const message = MessageFactory.createStopGeneration();
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Updates the API configuration.
   * @param config New API configuration
   * @returns Promise that resolves when the message is sent
   */
  async setApiConfig(config: ApiConfig): Promise<void> {
    const message = MessageFactory.createSetApiConfig(config);
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Edits an existing message.
   * @param messageId ID of the message to edit
   * @param newContent New content for the message
   * @returns Promise that resolves when the message is sent
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    const message = MessageFactory.createEditMessage(messageId, newContent);
    return window.electron.ElectronFlownoBridge.send(message);
  }

  /**
   * Generic method to send any valid IPC message.
   * @param message Message to send
   * @returns Promise that resolves when the message is sent
   */
  async sendMessage(message: IPCMessage): Promise<void> {
    return window.electron.ElectronFlownoBridge.send(message);
  }
}