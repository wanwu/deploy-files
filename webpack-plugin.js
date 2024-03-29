/**
 * @file upload plugin
 * @author jinzhan <steinitz@qq.com>
 */

const md5 = require('md5');
const upload = require('./index');
const fsrUpload = require('./fsr');

/*
 * webpack.config.js中配置deployMap字段
 *
 * 配置示例:
 *
 * ...
 *
 * deployMap: {
 *    sandbox: {
 *        receiver: 'http://YOUR_HOST/receiver',
 *        templatePath: '/home/work/nginx_static/html/test/template',
 *        templateSuffix: '.tpl', // '.(san|html)'或 '\.(san|html)'
 *        staticPath: '//home/work/nginx_static/html/test/static',
 *        staticDomain: 'http://test.com:8888'
 *    }
 * }
 *
 * **/

const PLUGIN_NAME = 'WebpackDeployPlugin';

class Upload {
    constructor(options = {}) {
        this.options = options;
        this.uploadOptions = {
            host: options.host,
            receiver: options.receiver,
            retry: 2
        };
        this.throttle = options.throttle || 200;
        this.compilationAssets = {};
        const tplSuffix = options.templateSuffix || '.tpl';
        // default: /\.tpl$/
        this.tplReg = new RegExp((tplSuffix.indexOf('.') === 0 ? '\\' : '') + tplSuffix + '$');
    }

    apply(compiler) {
        const options = this.options;

        compiler.hooks.watchRun.tap(PLUGIN_NAME, compiler => {
            this.uploadOptions.aborted = true;
        });

        compiler.hooks.emit.tap(PLUGIN_NAME, compilation => {
            this.uploadOptions.aborted = false;
            // 过滤掉已经上传成功的文件
            const compilationAssets = this.filterFiles(compilation.assets);
            const targetFiles = Object.keys(compilationAssets).map(filename => {
                const to = this.tplReg.test(filename) ? options.templatePath : options.staticPath;
                return {
                    host: options.host,
                    receiver: options.receiver,
                    content: this.getContent(filename, compilation),
                    to,
                    subpath: filename.replace(/\?.*$/, '')
                };
            });

            // FIS安全部署服务
            const uploadHandler = options.disableFsr ? upload : fsrUpload;
            const startTime = Date.now();
            setTimeout(() => {
                uploadHandler(targetFiles, this.uploadOptions, () => {
                    // 对于存在hash的文件，使用 1 作为flag
                    // 对于 tpl、html 这种没有 hash 的文件，使用内容的 md5 作为flag
                    Object.keys(compilationAssets).forEach(filename => {
                        this.compilationAssets[filename] = md5(compilationAssets[filename].source());
                    });

                    console.log('\n');
                    console.log('UPLOAD completed in ' + (Date.now() - startTime) + 'ms.');
                });
            }, this.throttle);
        });
    }

    filterFiles(assets) {
        const targetAssets = {};
        // 过滤掉已经上传成功的文件
        Object.keys(assets).forEach(filename => {
            if (this.compilationAssets[filename] && (  
             this.compilationAssets[filename] === md5(assets[filename].source())
            )) {
                return;
            }
            targetAssets[filename] = assets[filename];
        });
        return targetAssets;
    }

    getContent(filename, compilation) {
        const isContainCdn = /\.(css|js)$/.test(filename) || this.tplReg.test(filename);;
        const source = compilation.assets[filename].source();
        if (isContainCdn) {
            const reg = new RegExp(this.options.baseUrl, 'g');
            return source.toString().replace(reg, this.options.staticDomain);
        }
        return source;
    }
}

module.exports = Upload;
