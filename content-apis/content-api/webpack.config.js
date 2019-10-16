/* eslint-disable no-undef, @typescript-eslint/no-var-requires */
var path = require('path')
var nodeExternals = require('webpack-node-externals')
var { CleanWebpackPlugin } = require('clean-webpack-plugin')
var TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = {
    entry: [path.resolve(__dirname, 'src/index.ts')],
    devtool: 'cheap-source-map',
    target: 'node',
    externals: [nodeExternals()],
    module: {
        rules: [{
            test: /\.ts?$/,
            use: {
                loader: 'ts-loader',
                options: {
                    compilerOptions: { noEmit: false },
                    transpileOnly: process.env.SKIP_TYPE_CHECK ? true : false,
                },
            },
            exclude: /node_modules/,
        }, ],
    },
    plugins: [new CleanWebpackPlugin()],
    resolve: {
        extensions: ['.js', '.tsx', '.ts'],
        plugins: [new TsconfigPathsPlugin()],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    },
}
