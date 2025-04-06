import { contextBridge, ipcRenderer } from "electron";
import { IPC_DummyService_returnSomething } from "@infra/IPCChannels";
import { IPC_ElectronFlownoBridge_start } from "@infra/IPCChannels";
import { IPC_ElectronFlownoBridge_stop } from "@infra/IPCChannels";

contextBridge.exposeInMainWorld("electron", {
  DummyService: {
    returnSomething: () => ipcRenderer.invoke(IPC_DummyService_returnSomething),
  },
  ElectronFlownoBridge: {
    start: () => ipcRenderer.invoke(IPC_ElectronFlownoBridge_start),
    stop: () => ipcRenderer.invoke(IPC_ElectronFlownoBridge_stop),
  },
});

declare global {
  interface Window {
    electron: {
      DummyService: {
        returnSomething: () => Promise<string>;
      };
      ElectronFlownoBridge: {
        start: (timeCallback: (time: number) => void) => Promise<void>;
        stop: () => Promise<void>;
      };
    };
  }
}
