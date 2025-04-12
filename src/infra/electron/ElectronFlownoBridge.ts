import { app, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import path from "path";
import { PythonRunner } from "electron-flowno-bridge";
import { IPC_ElectronFlownoBridge_messageForRenderer } from "@infra/IPCChannels";

export interface IElectronFlownoBridge {
  start(event: IpcMainEvent): void;
  waitForCompletion(event: IpcMainEvent): Promise<void>;
  send(event: IpcMainEvent, message: any): Promise<void>; // Accept any JSON-serializable object
  registerMessageListener(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): Promise<void>;
}

export class ElectronFlownoBridge implements IElectronFlownoBridge {
  private pythonRunner?: PythonRunner;

  constructor() {
    console.log("==== ElectronFlownoBridge instance created ====");
  }

  start(_event: IpcMainEvent): void {
    // Check if a runner already exists and is running
    if (this.pythonRunner) {
      try {
        if (this.pythonRunner.isRunning()) {
          console.log("ElectronFlownoBridge: Python runner already running, ignoring start request");
          return;
        } else {
          console.log("ElectronFlownoBridge: Previous Python runner exists but is not running, creating new one");
        }
      } catch (error) {
        console.error("Error checking runner status:", error);
        // Continue to create a new runner
      }
    }

    console.log("ElectronFlownoBridge: Starting new Python runner");
    const isDev = !app.isPackaged;
    const appPath = app.getAppPath();
    const resourcesPath = isDev
      ? path.join(appPath, "node_modules/electron-flowno-bridge/resources")
      : path.join(appPath, "../resources");

    const extraPaths = isDev
      ? [path.join(appPath, "src/infra/python/primary-interp/src")]
      : [];

    try {
      this.pythonRunner = new PythonRunner({
        resource_path: resourcesPath,
        module: "FlownoApp.chat_app",
        module_attribute: "app",
        extra_search_paths: extraPaths,
        env: {
          FLOWNO_LOG_LEVEL: "INFO", // Reduced logging level
        },
      });
      this.pythonRunner.start();
      console.log("ElectronFlownoBridge: Python runner started successfully");
    } catch (error) {
      console.error("Failed to start Python runner:", error);
      throw error;
    }
  }

  async waitForCompletion(_event: IpcMainEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pythonRunner) {
        try {
          this.pythonRunner.waitForCompletion();
          resolve();
        } catch (error) {
          console.error("Error waiting for Python runner completion:", error);
          reject(error);
        }
      } else {
        console.error("Python runner is not initialized");
        reject(new Error("Python runner is not initialized"));
      }
    });
  }

  async send(_event: IpcMainEvent, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pythonRunner && this.pythonRunner.isRunning()) {
        try {
          // Pass message directly - could be string or object
          console.log("Sending message to Python:", typeof message === 'object' ? JSON.stringify(message) : message);
          this.pythonRunner.send(message);
          resolve();
        } catch (error) {
          console.error("Error sending message to Python:", error);
          reject(error);
        }
      } else {
        const error = "Python runner is not initialized or not running";
        console.error(error);
        reject(new Error(error));
      }
    });
  }

  /// Register a message listener to receive messages from Python
  /// and forward them to the main window renderer process
  async registerMessageListener(_event: IpcMainInvokeEvent, mainWindow: BrowserWindow): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pythonRunner) {
        console.log("Registering message listener with Python");
        try {
          this.pythonRunner.registerMessageListener((message) => {
            // Message could be string or object
            console.log("Received message from Python:", typeof message === 'object' ? JSON.stringify(message) : message);
            // Forward the message to the renderer process
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send(IPC_ElectronFlownoBridge_messageForRenderer, message);
            }
          });
          resolve();
        } catch (error) {
          console.error("Error registering message listener:", error);
          reject(error);
        }
      } else {
        console.error("Python runner is not initialized");
        reject(new Error("Python runner is not initialized"));
      }
    });
  }
}
