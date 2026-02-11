const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/start.js",
  output: {
    path: path.resolve(__dirname, "./"),
    filename: "app.bundle.js",
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, "src/"),
      },
    ],
  },

  devServer: {
    port: 8080,
    hot: true,
  },

  plugins: [
    new webpack.DefinePlugin({
      "typeof CANVAS_RENDERER": JSON.stringify(true),
      "typeof WEBGL_RENDERER": JSON.stringify(true),
      "process.env.WORLDSERVER_URL": JSON.stringify(
        process.env.WORLDSERVER_URL ||
          (process.env.NODE_ENV === "development"
            ? "ws://localhost:7778"
            : "wss://onlinelounge-world.drawvid.com:443"),
      ),
      "process.env.MATCHMAKER_URL": JSON.stringify(
        process.env.MATCHMAKER_URL || "wss://matchmaker.drawvid.com",
      ),
    }),
  ],
};
