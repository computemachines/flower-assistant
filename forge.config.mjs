import { fileURLToPath } from 'url';
import path from 'path';
import { execSync } from "child_process";

import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import mainConfig from "./webpack.main.config.mjs";
import rendererConfig from "./webpack.renderer.config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(mainConfig);

const config = {
  packagerConfig: {
    asar: {
      unpackDir: "resources",
    },
    extraResource: ["node_modules/electron-flowno-bridge/resources/"],
  },
  rebuildConfig: {},
  makers: [
    //new MakerSquirrel({}),
    //new MakerZIP({}, ['darwin']),
    //new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/index.html",
            js: rendererConfig.entry,
            name: "main_window",
            preload: {
              js: "./src/renderer-preload.ts",
            },
          },
        ],
      },
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    postPackage: async (forgeConfig, options) => {
      // Example: run embedded python
      const outputDir = options.outputPaths[0];
      const embeddedPythonPath = `${outputDir}/resources/resources/x86_64-linux/python/bin/python3.12`;

      try {
        // Check Python version
        execSync(`${embeddedPythonPath} --version`, { stdio: "inherit" });
        
        // Install primary_interp
        console.log("Installing primary_interp...");
        const whlPath = path.resolve(__dirname, "src/infra/python/primary-interp/dist/primary_interp-1.0.0-py3-none-any.whl");
        execSync(`${embeddedPythonPath} -m pip install ${whlPath}`, { stdio: 'inherit' });
        
        // Download spaCy model
        console.log("Downloading spaCy English language model...");
        execSync(`${embeddedPythonPath} -m spacy download en_core_web_sm`, { stdio: 'inherit' });
        
        console.log("Python setup completed successfully");
      } catch (error) {
        console.error("Error running embedded Python:", error);
      }
    },
  },
};

export default config;
