import { contextBridge, ipcRenderer } from "electron";
import { 
  IPC_DummyService_returnSomething, 
  IPC_ElectronFlownoBridge_send, 
  IPC_ElectronFlownoBridge_start,
  IPC_ElectronFlownoBridge_waitForCompletion,
  IPC_ElectronFlownoBridge_registerMessageListener,
  IPC_ElectronFlownoBridge_messageForRenderer
} from "@infra/IPCChannels";

contextBridge.exposeInMainWorld("electron", {
  DummyService: {
    returnSomething: () => ipcRenderer.invoke(IPC_DummyService_returnSomething),
  },
  ElectronFlownoBridge: {
    start: () => ipcRenderer.send(IPC_ElectronFlownoBridge_start),
    waitForCompletion: () =>
      ipcRenderer.invoke(IPC_ElectronFlownoBridge_waitForCompletion),
    send: (message: string) => ipcRenderer.invoke(IPC_ElectronFlownoBridge_send, message),

    registerMessageListener(callback: (message: string) => void) {

      const listener = (_event: Electron.IpcRendererEvent, message: string) => {
        callback(message);
      };

      ipcRenderer.on(IPC_ElectronFlownoBridge_messageForRenderer, listener);

      ipcRenderer.invoke(IPC_ElectronFlownoBridge_registerMessageListener);
      
      
      // Return a function to remove the listener
      return () => {
        ipcRenderer.removeListener(IPC_ElectronFlownoBridge_messageForRenderer, listener);
      };
    }
  },
});

declare global {
  interface Window {
    electron: {
      DummyService: {
        returnSomething: () => Promise<string>;
      };
      ElectronFlownoBridge: {
        start: () => void;
        waitForCompletion: () => Promise<void>;
        send: (message: string) => Promise<void>;
        registerMessageListener: (callback: (message: string) => void) => () => void;
      };
    };
  }
}
