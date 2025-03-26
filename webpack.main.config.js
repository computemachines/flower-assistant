import path from 'path';
import { rules } from './webpack.rules.js';
import { plugins } from './webpack.plugins.js';

const __dirname = path.resolve(path.dirname(''));

const mainConfig = {
  entry: './src/index.ts',
  //target: 'electron-main',
  //output: {
  //  filename: 'main.js',
  //},
  //mode: 'development',
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  externals: {
    //'electron-flowno-bridge': 'commonjs2 electron-flowno-bridge',
  },
};

export default mainConfig;
