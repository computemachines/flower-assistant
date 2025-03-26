import { app, BrowserWindow } from "electron";
import path from "path";
import { MainWindow } from "./MainWindow";
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from "electron-devtools-installer";

export default class Main {
  static mainWindow: MainWindow;
  static application: Electron.App;
  static BrowserWindow: typeof BrowserWindow;

  private static onWindowAllClosed() {
    if (process.platform !== "darwin") {
      Main.application.quit();
    }
  }

  private static async installDevTools() {
    try {
      await installExtension(REACT_DEVELOPER_TOOLS);
      console.log("installed react dev tools");
      await installExtension(REDUX_DEVTOOLS);
      console.log("installed redux dev tools");
    } catch (e) {
      console.log("Unable to install dev tools", e);
    }
  }

  private static openMainWindow() {
    if (Main.mainWindow && !Main.mainWindow.isDestroyed()) {
      Main.mainWindow.show();
    } else {
      Main.mainWindow = new MainWindow();
      Main.mainWindow.load();
      Main.mainWindow.on("closed", Main.onWindowAllClosed);
    }
  }

  private static startPythonRunner() {
    // Determine if we're in development mode.
    const isDev = !Main.application.isPackaged;
  }

  private static async onReady() {
    if (process.env.NODE_ENV === "development") {
      await Main.installDevTools();
      console.log("enable remote debugging");
      Main.application.commandLine.appendSwitch(
        "remote-debugging-port",
        "9222",
      );
    }

    Main.openMainWindow();
    console.log("Starting Python runner...");
    Main.startPythonRunner();
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    Main.BrowserWindow = browserWindow;
    Main.application = app;
    Main.application.on("window-all-closed", Main.onWindowAllClosed);
    Main.application.on("ready", Main.onReady);

    // On macOS, re-create a window when the dock icon is clicked and no other windows are open.
    Main.application.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        Main.openMainWindow();
      }
    });
  }
}
