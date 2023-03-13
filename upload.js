/**
 * @file upload.js
 * @author zttonly <zttonly@163.com>
 */

const md5 = require('md5');
const upload = require('./index');
const fsrUpload = require('./fsr');

/*
 * node使用, 上传
 *
 * 参数说明:
 * disableFsr: 默认启用fsr 默认false
 * host: fsr上传 host
 * receiver: fsr上传 receiver
 * to: fsr上传 to
 * files: 文件对象{[filenam]: [sourceCode]}
 * replace: 替换内容 [{from:'', to:''}]
 *
 * **/

class Upload {
    constructor(options = {}) {
        this.options = options;
        this.uploadOptions = {
            host: options.host,
            receiver: options.receiver,
            retry: 2,
            aborted: false
        };
        this.throttle = options.throttle || 200;
        this.files = options.files;
        this.to = options.to;
        this.replace = options.replace;

        this._running = false;
        this._deployFiles = {};
    }

    run(cb) {
        if (this.running) {
            this.uploadOptions.aborted = true;
            clearTimeout(this.running);
            this.running = null;
        }
        const options = this.options;
        // 过滤掉已经上传成功的文件
        const targetFiles = this.filterFiles(this.files);
        const uploadTargets = Object.keys(targetFiles).map(filename => {
            return {
                host: options.host,
                receiver: options.receiver,
                content: this.getContent(filename, targetFiles[filename]),
                to: options.to,
                subpath: filename.replace(/\?.*$/, '')
            };
        });

        // 是否FIS安全部署服务
        const uploadHandler = options.disableFsr ? upload : fsrUpload;
        const startTime = Date.now();
        this.running = setTimeout(() => {
            this.uploadOptions.aborted = false;
            uploadHandler(uploadTargets, this.uploadOptions, () => {
                // 对于存在hash的文件，使用 1 作为flag
                // 对于 tpl、html 这种没有 hash 的文件，使用内容的 md5 作为flag
                Object.keys(targetFiles).forEach(filename => {
                    if (targetFiles[filename]) {
                        this._deployFiles[filename] = md5(targetFiles[filename]);
                    }
                });
                if (cb) {
                    return cb();
                }
                console.log('\n');
                console.log('Upload completed in ' + (Date.now() - startTime) + 'ms.');
            });
        }, this.throttle);
    }

    filterFiles(files) {
        const targetFiles = {};
        // 过滤掉已经上传成功的文件
        Object.keys(files).forEach(filename => {
            if (this._deployFiles[filename] && (  
                this._deployFiles[filename] === md5(files[filename])
            )) {
                return;
            }
            targetFiles[filename] = files[filename];
        });
        return targetFiles;
    }

    getContent(filename, source) {
        const isContainCdn = /\.(css|js|html|tpl)$/.test(filename);
        if (isContainCdn) {
            source = source.toString();
            this.replace.forEach(re => {
                const reg = typeof re.from === 'string' ? new RegExp(re.from, 'ig') : re.from;
                source = source.replace(reg, re.to);
            });
        }
        return source;
    }
}

module.exports = Upload;
