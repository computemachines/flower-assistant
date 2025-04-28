import { app, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import path from "path";
import { PythonRunner } from "electron-flowno-bridge";
import { IPC_ElectronFlownoBridge_messageForRenderer } from "@infra/IPCChannels";

export interface IElectronFlownoBridge {
  start(event: IpcMainEvent): void;
  waitForCompletion(event: IpcMainEvent): Promise<void>;
  send(event: IpcMainEvent, message: any): Promise<void>; // Accept any JSON-serializable object
  registerMessageListener(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): Promise<void>;
  isRunning(event: IpcMainInvokeEvent): Promise<boolean>;
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

    // Always load the embedded interpreter so libpython3.12.so lives under `python_home/lib`
    const resourcesPath = isDev
      ? path.join(appPath, "node_modules/electron-flowno-bridge/resources")
      : path.join(appPath, "../resources");
    const pythonHome = path.join(resourcesPath, "x86_64-linux/python");
    console.log(`${isDev ? "[Dev Mode]" : "[Prod Mode]"} python_home = ${pythonHome}`);

    // In dev, install your editable primary-interp + deps into python-dev-venv-embedded.
    // We'll add its site‑packages to Python’s module_search_paths.
    const extraPaths: string[] = [];
    if (isDev) {
      const venvSite = path.join(appPath, "python-dev-venv-embedded/lib/python3.12/site-packages");
      console.log(`[Dev Mode] adding venv site-packages to module_search_paths: ${venvSite}`);
      extraPaths.push(path.join(appPath, "src/infra/python/primary-interp/src"));
      extraPaths.push(path.join(appPath, "src/infra/native/electron-flowno-bridge/python"));
      extraPaths.push(venvSite);
    }

    try {
      this.pythonRunner = new PythonRunner({
        python_home: pythonHome, // Use the calculated path
        module: "FlownoApp",
        module_attribute: "app",
        extra_search_paths: extraPaths,
        env: {
          FLOWNO_LOG_LEVEL: "WARNING",
          FLOWNO_NATIVE_LOG_LEVEL: "WARNING", 
          NODEJS_BRIDGE_VERBOSE: "0",
          NODEJS_BRIDGE_DEBUG: "0", 
          PYTHONUNBUFFERED: "1", // Set to 1 for unbuffered output
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

  /// Check if the Python runner is running
  async isRunning(_event: IpcMainInvokeEvent): Promise<boolean> {
    if (!this.pythonRunner) {
      return false;
    }
    
    try {
      return this.pythonRunner.isRunning();
    } catch (error) {
      console.error("Error checking Python runner status:", error);
      return false;
    }
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
