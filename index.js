const path = require('path');
const colors = require('colors');
const util = require('./util');

/**
 * 上传文件到远程服务
 *
 * @param {Array} files 要上传的文件
 * @param {string} file.receiver 上传服务地址
 * @param {string} file.to 上传到远程的文件目录路径
 * @param {Object} file.data 上传时额外参数
 * @param {string | Buffer} file.content 上传的文件内容
 * @param {string} file.subpath 上传前的文件完整路径（包含文件名）
 * @param {Object} options 一些额外的配置项目
 * @param {Function} callback 上传结果回调
 */
module.exports = (files, options, callback) => {
    // 获取远程上传的完整地址，兼容windows以及linux(or macos)
    files.forEach(file => {
        const {
            receiver,
            data = {},
            content,
            subpath
        } = file;
        data.to = path.join(file.to, file.subpath).replace(/\\\\/g, '/').replace(/\\/g, '/');
        util.upload({
            receiver,
            data,
            content,
            subpath
        }, (err, res) => {
            if (err || res.trim() != '0') {
                /* eslint-disable max-len */
                throw new Error(`upload file [${subpath}] to [${data.to}] by receiver [${receiver}] error [${err || res}]`);
                /* eslint-enable max-len */
            }
            const time = '[' + util.now() + ']';
            process.stdout.write(
                ' - '.green.bold
                + time.grey + ' '
                + subpath.replace(/^\//, '')
                + ' >> '.yellow.bold
                + data['to']
                + '\n'
            );
        });
    });
    callback && callback();
};
