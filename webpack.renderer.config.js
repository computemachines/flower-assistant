
import { rules } from './webpack.rules.js';
import { rendererPlugins } from './webpack.plugins.js';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

export const rendererConfig = {
  entry: './src/renderer/index.tsx',
  module: {
    rules,
  },
  plugins: rendererPlugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
