const path = require('path');

const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerZIP } = require('@electron-forge/maker-zip');
const { MakerDeb } = require('@electron-forge/maker-deb');
const { MakerRpm } = require('@electron-forge/maker-rpm');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const { WebpackPlugin } = require('@electron-forge/plugin-webpack');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const mainConfig = require('./webpack.main.config');
const { rendererConfig } = require('./webpack.renderer.config');

console.log(mainConfig);

const config = {
  packagerConfig: {
    asar: {
      unpackDir: '.webpack/main/resources/'
    },
    extraResource: [
      "resources/",
    ],
  },
  rebuildConfig: {},
  makers: [
    //new MakerSquirrel({}),
    //new MakerZIP({}, ['darwin']),
    //new MakerRpm({}),
    new MakerDeb({})
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
        mainConfig,
       renderer: {
         config: rendererConfig,
         entryPoints: [
           {
             html: './src/index.html',
             js: './src/renderer.ts',
             name: 'main_window',
             preload: {
               js: './src/preload.ts',
             },
           },
         ],
       },
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

module.exports = config;
