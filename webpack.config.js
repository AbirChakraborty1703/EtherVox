const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/js/app.js',
  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'public'),
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "url": require.resolve("url"),
      "util": require.resolve("util"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "path": require.resolve("path-browserify")
    }
  },
  plugins: [
    new (require('webpack')).ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ],
  devtool: 'source-map',
  performance: {
    maxAssetSize: 1000000,
    maxEntrypointSize: 1000000
  }
};
