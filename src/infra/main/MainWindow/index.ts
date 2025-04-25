import * as Electron from "electron";
import { ipcMain, BrowserWindow } from "electron";
import { IDummyService } from "../DummyService";
import { IPCRegistry } from "../IPCRegistry";
import { ElectronFlownoBridge } from "../ElectronFlownoBridge";

export class MainWindow {
  window: Electron.BrowserWindow;
  protected ipcRegistry: IPCRegistry;

  constructor(
    private dummyService: IDummyService,
    private flownoBridge: ElectronFlownoBridge,
  ) {
    this.window = new Electron.BrowserWindow({
      width: 600,
      height: 400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });

    this.ipcRegistry = new IPCRegistry(dummyService, flownoBridge, this.window);
    this.ipcRegistry.registerIPCHandlers(ipcMain);

    this.window.on("closed", () => {
      this.window = null;
      this.ipcRegistry.unregisterIPCHandlers(ipcMain);
    });
    // Electron.app.on("window-all-closed", () => {
    //   if (process.platform !== "darwin") {
    //     Electron.app.quit();
    //   }
    // });
    this.window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }
}
