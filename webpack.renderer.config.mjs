import { rules } from "./webpack.rules.mjs";
import path from "path";
import { rendererPlugins } from "./webpack.plugins.mjs";
import { fileURLToPath } from "url";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

rules.push({
  test: /\.css$/,
  include: path.resolve(__dirname, "src"),
  use: [
    { loader: "style-loader" },
    { loader: "css-loader" },
    {
      loader: "postcss-loader",
    },
  ],
});

rules.push({
  test: /\.woff2?$/,
  type: "asset/resource",
});

export default {
  entry: "./src/renderer-entry.ts",
  module: {
    rules,
  },
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  plugins: rendererPlugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
    alias: {
      "@features": path.resolve(__dirname, "src/features"),
      "@core": path.resolve(__dirname, "src/core"),
      "@infra": path.resolve(__dirname, "src/infra"),
      "@components": path.resolve(__dirname, "src/components"),
    },
  },
  devtool: "source-map",
};
