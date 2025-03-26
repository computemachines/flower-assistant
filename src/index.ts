import { app, BrowserWindow } from "electron";
import Main from "./electron/electron-main";
import { PythonRunner } from "electron-flowno-bridge";
import * as path from 'path';
import * as fs from 'fs';

// Determine the correct resources path
const isDevMode = process.env.NODE_ENV === 'development';
const appPath = app.getAppPath();
console.log(`[Electron Main] App path: ${appPath}`);

// The path is different in development vs production
let resourcesPath;
if (isDevMode) {
  resourcesPath = path.join(appPath, '.webpack', 'main', 'resources');
} else {
  resourcesPath = path.join(process.resourcesPath, 'app.asar.unpacked', '.webpack', 'main', 'resources');
}

console.log("[Electron Main] Starting PythonRunner...");
let runner = new PythonRunner(resourcesPath);
console.log(`[Electron Main] PythonRunner started with resources path: ${resourcesPath}`);

console.log("[Electron Main] JS: Starting Python runner...");
runner.start((time: string) => {
  console.log(`[Electron Main] JS Callback: Received Python tick at: ${time}`);
});
console.log("[Electron Main] JS: Runner started");

const intervalId = setInterval(() => {
  console.log("[Electron Main] JS: Python runner is running in a separate thread...");
}, 1000);

setTimeout(() => {
  console.log("[Electron Main] JS: Shutting down...");
  runner.stop();
  console.log("[Electron Main] JS: Stopped Python runner");
  clearInterval(intervalId);
}, 1000);

Main.main(app, BrowserWindow);
