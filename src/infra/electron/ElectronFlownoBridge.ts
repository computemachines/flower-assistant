import { app } from "electron";
import path from "path";
import { PythonRunner } from "electron-flowno-bridge";

export interface IElectronFlownoBridge {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export class ElectronFlownoBridge implements IElectronFlownoBridge {
  private pythonRunner?: PythonRunner;

  constructor() {
    console.log("ElectronFlownoBridge instance created");
  }

  async start(): Promise<void> {
    const isDev = !app.isPackaged;
    const appPath = app.getAppPath();
    const resourcesPath = isDev
      ? path.join(appPath, "node_modules/electron-flowno-bridge/resources")
      : path.join(appPath, "resources");

    this.pythonRunner = new PythonRunner(resourcesPath);
  }

  async stop(): Promise<void> {
    if (this.pythonRunner) {
      await this.pythonRunner.stop();
    }
  }

  isRunning(): boolean {
    return !!this.pythonRunner;
  }
}
