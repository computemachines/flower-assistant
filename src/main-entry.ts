import { app, BrowserWindow } from "electron";
import Main from "@infra/electron/main";
import { PythonRunner } from "electron-flowno-bridge";
import * as path from "path";
import * as fs from "fs";

Main.main(BrowserWindow);
