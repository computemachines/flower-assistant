import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const basePlugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
];

const nativeModuleCopyPlugin = new CopyWebpackPlugin({
    patterns: [
      {
        from: 'node_modules/electron-flowno-bridge/native/build/Release/electron-flowno-bridge.node',
        to: 'native_modules/electron-flowno-bridge.node',
      },
    ],
  });

 
export const mainPlugins = [...basePlugins, nativeModuleCopyPlugin];

export const rendererPlugins = [...basePlugins];