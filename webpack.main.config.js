import path from 'path';
import { rules } from './webpack.rules.js';
import { mainPlugins } from './webpack.plugins.js';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const mainConfig = {
  entry: './src/index.ts',
  target: 'electron-main',
  module: {
    rules,
  },
  plugins: mainPlugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  externals: {
  },
};

export default mainConfig;
