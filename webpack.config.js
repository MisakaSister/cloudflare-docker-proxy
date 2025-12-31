const path = require("path");

module.exports = {
  entry: "./edge-functions/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    module: true,
    chunkFormat: "module",
  },
  context: path.resolve(__dirname, "./"),
  target: "webworker",
  mode: "production",
  experiments: {
    outputModule: true,
  },
  optimization: {
    usedExports: true,
    minimize: false,
  },
  module: {
    rules: [
      {
        include: /node_modules/,
        test: /\.mjs$/,
        type: "javascript/auto",
      },
    ],
  },
};
