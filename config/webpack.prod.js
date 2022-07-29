const os = require("os");
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const threads = os.cpus().length;//CPU核数
const TerserPlugin = require("terser-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");


//用来处理获取样式的loader
function getStyleLoader(pre) {
    return [
        MiniCssExtractPlugin.loader, //提取css成单独文件
        "css-loader", //将css资源编译成commonjs的模块到js中
        {
            loader: "postcss-loader",
            options: {
                postcssOptions: {
                    plugins: [
                        "postcss-preset-env", // 能解决大多数样式兼容性问题
                    ],
                },
            },
        },
        pre
    ].filter(Boolean)
}

module.exports = {
    // 入口
    entry: "./src/main.js",//相对路径
    // 输出
    output: {
        //开发模式没有输出
        path: path.resolve(__dirname, "../dist"),
        //入口文件打包输出文件名
        filename: "static/js/main.js",
        clean: true
    },
    // 加载器
    module: {
        rules: [
            {
                //每个文件只能被其中一个loader处理
                oneOf: [
                    {
                        test: /\.css$/i,
                        use: getStyleLoader()
                    },
                    {
                        test: /\.s[ac]ss$/,
                        use: getStyleLoader('sass-loader')
                    },
                    {
                        test: /\.(png|jpe?g|gif|webp)$/,
                        type: "asset",
                        parser: {
                            dataUrlCondition: {
                                maxSize: 10 * 1024 //小于10kb会转为base64
                            }
                        },
                        generator: {
                            // 将图片文件输出到 static/imgs 目录中
                            // 将图片文件命名 [hash:8][ext][query]
                            // [hash:8]: hash值取8位
                            // [ext]: 使用之前的文件扩展名
                            // [query]: 添加之前的query参数
                            filename: "static/images/[hash:8][ext][query]",
                        },
                    },
                    {
                        test: /\.(ttf|woff2?|map4|map3|avi)$/,
                        type: "asset/resource",
                        generator: {
                            filename: "static/media/[hash:8][ext][query]",
                        },
                    },
                    {
                        test: /\.m?js$/,
                        // exclude: /node_modules/,
                        include: path.resolve(__dirname, '../src'),
                        use: [
                            {
                                loader: "thread-loader", // 开启多进程
                                options: {
                                    workers: threads, // 数量
                                },
                            },
                            {
                                loader: "babel-loader",
                                options: {
                                    cacheDirectory: true, // 开启babel编译缓存
                                    cacheCompression: false, // 缓存文件不要压缩
                                    plugins: ["@babel/plugin-transform-runtime"], // 减少代码体积
                                },
                            },
                        ],
                        // options: {
                        //     presets: ['@babel/preset-env']
                        // }

                    }
                ]
            }
        ],
    },
    // 插件
    plugins: [
        new ESLintPlugin({
            context: path.resolve(__dirname, '../src'),
            exclude: 'node_modules',
            cache: true, // 开启缓存
            // 缓存目录
            cacheLocation: path.resolve(
                __dirname,
                "../node_modules/.cache/.eslintcache"
            ),
            threads, // 开启多进程
        }),
        new HtmlWebpackPlugin({
            /* 
            模板：以public/index.html文件创建新的html文件
            新的html文件特点：1.结构和原来一致 2.自动引入打包资源
             */
            template: path.resolve(__dirname, '../public/index.html')
        }),
        new MiniCssExtractPlugin({
            filename: 'static/css/main.css'
        }),


    ],
    optimization: {
        minimize: true,
        minimizer: [
            // css压缩也可以写到optimization.minimizer里面，效果一样的
            new CssMinimizerPlugin(),
            // 当生产模式会默认开启TerserPlugin，但是我们需要进行其他配置，就要重新写了
            new TerserPlugin({
                parallel: threads // 开启多进程
            }),
            // 压缩图片
            new ImageMinimizerPlugin({
                minimizer: {
                    implementation: ImageMinimizerPlugin.imageminGenerate,
                    options: {
                        plugins: [
                            ["gifsicle", { interlaced: true }],
                            ["jpegtran", { progressive: true }],
                            ["optipng", { optimizationLevel: 5 }],
                            [
                                "svgo",
                                {
                                    plugins: [
                                        "preset-default",
                                        "prefixIds",
                                        {
                                            name: "sortAttrs",
                                            params: {
                                                xmlnsOrder: "alphabetical",
                                            },
                                        },
                                    ],
                                },
                            ],
                        ],
                    },
                },
            }),
        ],
    },
    // 模式
    mode: "production",
    devtool: 'source-map',
};
