const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: "development",
    entry: {
        app: './src/start.js'
    },
    output: {
        path: path.resolve(__dirname, './'),
        filename: 'app.bundle.js'
    },

    module: {
        rules: [
          {
            test: /\.js$/,
            include: path.resolve(__dirname, 'src/')
          }
        ]
    },

    devServer: {
        contentBase: path.resolve(__dirname, './'),
        host: '0.0.0.0',
        port: 8080,
        disableHostCheck: true,
    },

    plugins: [
    new webpack.DefinePlugin({
        'typeof CANVAS_RENDERER': JSON.stringify(true),
        'typeof WEBGL_RENDERER': JSON.stringify(true)
    })
    ]
};

