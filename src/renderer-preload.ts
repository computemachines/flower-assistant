import { DummyService } from "@infra/electron/DummyService";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  DummyService: {
    returnSomething: () => ipcRenderer.invoke("DummyService:returnSomething"),
  },
});

declare global {
  interface Window {
    electron: {
      DummyService: {
        returnSomething: () => Promise<string>;
      };
    };
  }
}
