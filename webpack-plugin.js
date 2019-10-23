/**
 * @file upload plugin
 * @author jinzhan <steinitz@qq.com>
 */

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
    }

    apply(compiler) {
        const options = this.options;
        compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation, callback) => {
            const targetFiles = Object.keys(compilation.assets).map(filename => {
                const to = /\.tpl$/.test(filename) ? options.templatePath : options.staticPath;
                return {
                    host: options.host,
                    receiver: options.receiver,
                    content: this.getContent(filename, compilation),
                    to,
                    subpath: filename
                };
            });
            // FIS安全部署服务
            const uploadHandler = options.disableFsr ? upload : fsrUpload;
            uploadHandler(targetFiles, {
                host: options.host,
                receiver: options.receiver,
                retry: 2
            }, () => {
                console.log('\n');
                console.log('UPLOAD COMPLETED!');
            });
            callback();
        });
    }

    getContent(filename, compilation) {
        const isContainCdn = /\.(css|js|tpl)$/.test(filename);
        const source = compilation.assets[filename].source();
        if (isContainCdn) {
            const reg = new RegExp(this.options.baseUrl, 'g');
            return source.toString().replace(reg, this.options.staticDomain);
        }
        return source;
    }
}

module.exports = Upload;
