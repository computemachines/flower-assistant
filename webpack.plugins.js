import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new CopyWebpackPlugin({
    patterns: [
      {
        from: 'node_modules/electron-flowno-bridge/native/build/Release/electron-flowno-bridge.node',
        to: 'native_modules/electron-flowno-bridge.node',
      },
      {
        from: 'node_modules/electron-flowno-bridge/resources/',
        to: 'resources',
      },
      {
        from: 'resources/', // Copy the local resources folder
        to: 'resources',    // Merge into .webpack/resources
      },
    ],
  }),
];
