import { BrowserWindow } from 'electron';
import path from 'path';

export class MainWindow extends BrowserWindow {
  constructor() {
    super({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
      },
    });
  }
  
  load() {
    this.loadFile(path.join(__dirname, '../src/electron/renderer/index.html'));
  }
}
