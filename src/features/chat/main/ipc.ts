import { ipcMain } from "electron";
// import { IPC_EVENTS } from "@shared/ipc-events";
import { ChatService } from "./chat-service";

export function setupChatIPC(mainWindow: Electron.BrowserWindow) {
  // ipcMain.on(IPC_EVENTS.CHAT.SEND, async (event, message) => {
  //   const chatService = new ChatService();
  //   const response = await chatService.processMessage(message);
  //   mainWindow.webContents.send(IPC_EVENTS.CHAT.RECEIVE, response);
  // });
}
