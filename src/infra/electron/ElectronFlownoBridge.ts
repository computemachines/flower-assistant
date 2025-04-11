import { app, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import path from "path";
import { PythonRunner } from "electron-flowno-bridge";
import { IPC_ElectronFlownoBridge_messageForRenderer } from "@infra/IPCChannels";

export interface IElectronFlownoBridge {
  start(event: IpcMainEvent): void;
    waitForCompletion(event: IpcMainEvent): Promise<void>;
  send(event: IpcMainEvent, message: any): Promise<void>; // Updated to accept any JSON-serializable object
  registerMessageListener(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): Promise<void>;
}

export class ElectronFlownoBridge implements IElectronFlownoBridge {
  private pythonRunner?: PythonRunner;

  constructor() {
    console.log("ElectronFlownoBridge instance created");
  }

  start(_event: IpcMainEvent): void {
    const isDev = !app.isPackaged;
    const appPath = app.getAppPath();
    const resourcesPath = isDev
      ? path.join(appPath, "node_modules/electron-flowno-bridge/resources")
      : path.join(appPath, "../resources");

    const extraPaths = isDev
      ? [path.join(appPath, "src/infra/python/primary-interp/src")]
      : [];

    this.pythonRunner = new PythonRunner({
      resource_path: resourcesPath,
      module: "FlownoApp.chat_app",
      module_attribute: "app",
      extra_search_paths: extraPaths,
      env: {
        FLOWNO_LOG_LEVEL: "DEBUG",
      },
    });
    this.pythonRunner.start();
  }

  async waitForCompletion(_event: IpcMainEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pythonRunner) {
        this.pythonRunner.waitForCompletion();
        resolve();
      } else {
        console.error("Python runner is not initialized");
        reject(new Error("Python runner is not initialized"));
      }
    });
  }

  async send(_event: IpcMainEvent, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pythonRunner) {
        console.log("Sending message to Python:", message);
        this.pythonRunner.send(message);
        resolve();
      } else {
        console.error("Python runner is not initialized");
        reject(new Error("Python runner is not initialized"));
      }
    });
  }

  /// Register a message listener to receive messages from Python
  /// and forward them to the main window renderer process
  async registerMessageListener(_event: IpcMainInvokeEvent, mainWindow: BrowserWindow): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pythonRunner) {
        console.log("Registering message listener with Python");
        this.pythonRunner.registerMessageListener((message) => {
          console.log("Received message from Python:", message);
          // Forward the message to the renderer process
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_ElectronFlownoBridge_messageForRenderer, message);
          }
        });
        resolve();
      } else {
        console.error("Python runner is not initialized");
        reject(new Error("Python runner is not initialized"));
      }
    });
  }
}
