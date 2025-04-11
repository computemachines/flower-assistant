import { BrowserWindow, IpcMain } from "electron";
import { IDummyService } from "./DummyService";
import { IElectronFlownoBridge } from "./ElectronFlownoBridge";
import {
  IPC_DummyService_returnSomething,
  IPC_ElectronFlownoBridge_send,
  IPC_ElectronFlownoBridge_start,
  IPC_ElectronFlownoBridge_waitForCompletion,
  IPC_ElectronFlownoBridge_registerMessageListener,
} from "@infra/IPCChannels";

export class IPCRegistry {
  constructor(
    private dummyService: IDummyService,
    private flownoBridge: IElectronFlownoBridge,
    private mainWindow: BrowserWindow,
  ) {}

  registerIPCHandlers(ipcMain: IpcMain) {
    ipcMain.handle(IPC_DummyService_returnSomething, this.dummyService.returnSomething);

    ipcMain.on(IPC_ElectronFlownoBridge_start, this.flownoBridge.start.bind(this.flownoBridge));
    ipcMain.handle(
      IPC_ElectronFlownoBridge_waitForCompletion,
      this.flownoBridge.waitForCompletion.bind(this.flownoBridge),
    );
    ipcMain.handle(
      IPC_ElectronFlownoBridge_send,
      this.flownoBridge.send.bind(this.flownoBridge),
    );
    ipcMain.handle(
      IPC_ElectronFlownoBridge_registerMessageListener,
      (event) => this.flownoBridge.registerMessageListener(event, this.mainWindow)
    );
  }

  unregisterIPCHandlers(ipcMain: IpcMain) {
    ipcMain.removeHandler(IPC_ElectronFlownoBridge_start);
    ipcMain.removeHandler(IPC_ElectronFlownoBridge_waitForCompletion);
    ipcMain.removeHandler(IPC_DummyService_returnSomething);
    ipcMain.removeHandler(IPC_ElectronFlownoBridge_send);
    ipcMain.removeHandler(IPC_ElectronFlownoBridge_registerMessageListener);
  }
}
