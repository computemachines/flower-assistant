import { BrowserWindow, Event, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from 'url';

export class MainWindow {
  private window: BrowserWindow;

  constructor() {
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });

    // Add IPC handler for chat messages
    ipcMain.on('SEND_MESSAGE', (event, message) => {
      console.log('Received message from renderer:', message);
    });
  }

  load() {
    this.window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  isDestroyed(): boolean {
    return this.window.isDestroyed();
  }

  show(): void {
    this.window.show();
  }

  on(event: 'closed', callback: () => void): void {
    this.window.on(event, callback);
  }
}
