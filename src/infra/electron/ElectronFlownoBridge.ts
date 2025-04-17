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

    const customPackagesPath = path.join(appPath, "python-dev-packages");
    
    const extraPaths = isDev
      ? [
          path.join(appPath, "src/infra/python/primary-interp/src"),
          customPackagesPath  // Add custom packages directory
        ]
      : [];

    try {
      this.pythonRunner = new PythonRunner({
        resource_path: resourcesPath,
        module: "FlownoApp.chat_app",
        module_attribute: "app",
        extra_search_paths: extraPaths,
        env: {
          FLOWNO_LOG_LEVEL: "WARNING",
          FLOWNO_NATIVE_LOG_LEVEL: "ERROR", 
          NODEJS_BRIDGE_VERBOSE: "0",
          NODEJS_BRIDGE_DEBUG: "0", 
          PYTHONUNBUFFERED: "0",
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
          // Only log when sending user messages to reduce noise
          if (typeof message === 'object' && message.type === 'new-prompt') {
            console.log("Sending message to Python:", JSON.stringify(message));
          }
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
        // Only log this once at startup
        console.log("Registering message listener with Python");
        try {
          this.pythonRunner.registerMessageListener((message) => {
            // Only log important messages (final chunks or non-chunk messages)
            // Skip logging for intermediate chunks to reduce noise
            const isFinalChunk = typeof message === 'object' && 
                                message.type === 'chunk' && 
                                message.final === true;
            const isNonChunkMessage = typeof message === 'object' && 
                                     message.type !== 'chunk';
                                     
            console.log("Received message from Python:", 
                        typeof message === 'object' ? 
                        JSON.stringify(message) : message);
            
            // Forward all messages to the renderer process
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
