import webpack from 'webpack';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

export default {
    mode: 'development',
    resolve: {
        extensions: ['*', '.js', '.jsx', '.json']
    },
    devtool: 'inline-source-map',
    entry: [
        path.resolve(__dirname, 'src/index'),
        'webpack-hot-middleware/client?reload=true'
    ],
    target: 'web',
    output: {
        path: path.resolve(__dirname, 'src'),
        publicPath: '/',
        filename: 'bundle.js'
    },
    plugins: [
        new webpack.LoaderOptionsPlugin({
            minimize: false,
            debug: true,
            noInfo: true // set to false to see a list of every file being bundled.
        }),
        // Create HTML file that includes reference to bundled JS.
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            inject: true
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin()
    ],
    module: {
        rules: [
            {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
            {test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader']}
        ]
    }
}
