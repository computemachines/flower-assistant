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
      this.window.setBounds({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });
  }

  load() {
    this.window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    this.window.once('ready-to-show', () => {
      this.window.show();
    });
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
