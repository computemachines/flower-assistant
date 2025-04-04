import { IpcMain } from "electron";
import { IDummyService } from "./DummyService";
import { IElectronFlownoBridge } from "./ElectronFlownoBridge";

export class IPCRegistry {
  constructor(
    private dummyService: IDummyService,
    private flownoBridge: IElectronFlownoBridge,
  ) {}

  registerIPCHandlers(ipcMain: IpcMain) {
    ipcMain.handle("DummyService:returnSomething", async () => {
      return this.dummyService.returnSomething();
    });

    ipcMain.handle("flowno-start", async () => {
      return this.flownoBridge.start();
    });

    ipcMain.handle("flowno-stop", async () => {
      return this.flownoBridge.stop();
    });
  }
  unregisterIPCHandlers(ipcMain: IpcMain) {
    ipcMain.removeHandler("get-something");
    ipcMain.removeHandler("flowno-start");
    ipcMain.removeHandler("flowno-stop");
  }
}
