
export const rules = [
  {
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  {
    // test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    test: /[/\\](node_modules[/\\].+\.(m?js|node)|native[/\\]build[/\\]Release[/\\].+\.node)$/,
    // test: /[/\\](node_modules[/\\].+\.(m?js|node)|node_modules[/\\].+[/\\]native[/\\]build[/\\]Release[/\\].+\.node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  },
];
