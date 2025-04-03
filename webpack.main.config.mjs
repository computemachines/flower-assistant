import path from "path";
import { fileURLToPath } from "url";
import { rules } from "./webpack.rules.mjs";
import { mainPlugins } from "./webpack.plugins.mjs";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainConfig = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: "./src/main-entry.ts",
  target: ["electron-main", "es2020"],
  module: {
    rules,
  },
  plugins: mainPlugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    alias: {
      "@features": path.resolve(__dirname, "src/features"),
      "@core": path.resolve(__dirname, "src/core"),
      "@infra": path.resolve(__dirname, "src/infra"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  externals: {},
  devtool: "source-map",
};

export default mainConfig;
