import { IpcMain } from "electron";
import { IDummyService } from "./DummyService";
import { IElectronFlownoBridge } from "./ElectronFlownoBridge";
import {
  IPC_DummyService_returnSomething,
  IPC_ElectronFlownoBridge_start,
  IPC_ElectronFlownoBridge_stop,
} from "@infra/IPCChannels";

export class IPCRegistry {
  constructor(
    private dummyService: IDummyService,
    private flownoBridge: IElectronFlownoBridge,
  ) {}

  registerIPCHandlers(ipcMain: IpcMain) {
    ipcMain.handle(IPC_DummyService_returnSomething, async () => {
      return this.dummyService.returnSomething();
    });

    ipcMain.handle(IPC_ElectronFlownoBridge_start, async () => {
      return await this.flownoBridge.run();
    });

    ipcMain.handle(IPC_ElectronFlownoBridge_stop, async () => {
      if (!this.flownoBridge.isRunning()) {
        return "FlownoBridge is not running";
      }
      return await this.flownoBridge.stop();
    });
  }
  unregisterIPCHandlers(ipcMain: IpcMain) {
    ipcMain.removeHandler(IPC_ElectronFlownoBridge_start);
    ipcMain.removeHandler(IPC_ElectronFlownoBridge_stop);
    ipcMain.removeHandler(IPC_DummyService_returnSomething);
  }
}
