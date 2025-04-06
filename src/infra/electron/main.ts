// 🛠️ Restructuring Plan:
// 1. Move window creation logic to src/infra/electron/windows.ts
// 2. Centralize IPC setup in src/infra/electron/app.ts
// 3. Migrate event handlers to modular components
// 4. Refactor main process into feature-specific modules

import { app, BrowserWindow } from "electron";
import path from "path";
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from "electron-devtools-installer";

import { PythonRunner } from "electron-flowno-bridge";
import { MainWindow } from "./MainWindow";
import { DummyService } from "./DummyService";
import { ElectronFlownoBridge } from "./ElectronFlownoBridge";

export default class Main {
  static mainWindow: MainWindow;
  static BrowserWindow: typeof BrowserWindow;
  static pythonRunner: PythonRunner;

  private static async installDevTools() {
    await installExtension(REACT_DEVELOPER_TOOLS);
    await installExtension(REDUX_DEVTOOLS);
  }

  private static async onReady() {
    if (process.env.NODE_ENV === "development") {
      await Main.installDevTools();
      app.commandLine.appendSwitch("remote-debugging-port", "9222");
    }

    Main.mainWindow = new MainWindow(
      new DummyService(),
      new ElectronFlownoBridge(),
    );
    Main.mainWindow.window.show();
  }

  static main(browserWindow: typeof BrowserWindow) {
    Main.BrowserWindow = browserWindow;
    app.on("before-quit", () => {
      // console.log("[Electron Main] JS: Stopped Python runner");
    });
    app.on("ready", async () => {
      await Main.onReady();
    });
  }
}
