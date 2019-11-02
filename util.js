/**
 * 遵从RFC规范的文件上传功能实现
 * @param  {string}   url      上传的url
 * @param  {Object}   options      配置
 * @param  {Object}   data     要上传的formdata，可传null
 * @param  {string | Buffer}   content  上传文件的内容
 * @param  {string}   subpath  上传文件的文件路径（包含文件名）
 * @param  {Function} callback 上传后的回调
 * @name upload
 * @function
 */

const upload = ({
    receiver,
    options = {},
    data = {},
    content,
    subpath
}, callback) => {
    // utf8编码
    if (typeof content === 'string') {
        content = Buffer.from(content);
    } else if (!(content instanceof Buffer)) {
        console.error('unable to upload content [%s]', (typeof content));
    }
    const endl = '\r\n';
    const boundary = '-----np' + Math.random();
    const postData = [];

    Object.keys(data).forEach(key => {
        if (data[key]) {
            postData.push('--' + boundary + endl);
            postData.push(`Content-Disposition: form-data; name="${key}"` + endl);
            postData.push(endl);
            postData.push(data[key] + endl);
        }
    });

    postData.push('--' + boundary + endl);
    const filename = subpath.split('/').pop();
    postData.push(`Content-Disposition: form-data; name="${options.uploadField || 'file'}"; filename="${filename}"` + endl);
    postData.push(endl);
    postData.push(content);
    postData.push(endl);
    postData.push('--' + boundary + '--' + endl);
    options.method = options.method || 'POST';

    let contentLength = 0;
    postData.forEach(item => {
        let len = typeof item === 'string' ? Buffer.from(item).length : item.length;
        contentLength += len;
    });

    const contentType = 'multipart/form-data; boundary=' + boundary;
    options.headers = Object.assign({
        'Content-Type': contentType,
        // 'Transfer-Encoding': 'chunked',
        'Content-Length': contentLength
    }, options.headers);

    options = parseUrl(receiver, options);
    const http = options.protocol === 'https:' ? require('https') : require('http');
    const req = http.request(options, res => {
        const status = res.statusCode;
        const body = [];
        res.on('data', chunk => {
                body.push(chunk);
            })
            .on('end', () => {
                if (status >= 200 && status < 300 || status === 304) {
                    callback(null, body.join(''));
                } else {
                    callback(status);
                }
            })
            .on('error', err => {
                callback(err.message || err);
            });
    });

    postData.forEach((data, index) => {
        req.write(data);
    });

    req.end();
};

/**
 * 获取当前时间
 * @return {string} HH:MM:SS
 * @name now
 * @function
 */
const now = () => {
    const d = new Date();
    return [
            d.getHours(),
            d.getMinutes(),
            d.getSeconds()
        ]
        .join(':')
        .replace(/\b\d\b/g, '0$&');
}


/**
 * url解析函数，规则类似require('url').parse
 * @param  {string} url 待解析的url
 * @param  {Object} options 解析配置参数 { host|hostname, port, path, method, agent }
 * @return {Object}     { protocol, host, port, path, method, agent }
 * @name parseUrl
 * @function
 */
const parseUrl = (url, options = {}) => {
    url = require('url').parse(url);
    const ssl = url.protocol === 'https:';
    options.host = options.host || options.hostname || ((ssl || url.protocol === 'http:') ? url.hostname : 'localhost');
    options.port = options.port || (url.port || (ssl ? 443 : 80));
    options.path = options.path || (url.pathname + (url.search || ''));
    options.method = options.method || 'GET';
    options.agent = options.agent || false;
    return options;
};


const fetch = (url, data, callback) => {
    const endl = '\r\n';
    const collect = [];
    let opt = {};
    Object.keys(data).forEach(item => {
        collect.push(item + '=' + encodeURIComponent(data[item]));
    });
    const content = collect.join('&');
    opt.method = opt.method || 'POST';
    opt.headers = Object.assign({
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    }, opt.headers || {});
    opt = parseUrl(url, opt);
    const http = opt.protocol === 'https:' ? require('https') : require('http');
    const req = http.request(opt, res => {
        const status = res.statusCode;
        let body = '';
        res.on('data', chunk => {
                body += chunk;
            })
            .on('end', function () {
                if (status >= 200 && status < 300 || status === 304) {
                    let json = null;
                    try {
                        json = JSON.parse(body);
                    } catch (e) {};

                    if (!json || json.errno) {
                        callback(json || 'The response is not valid json string.')
                    } else {
                        callback(null, json);
                    }
                } else {
                    callback(status);
                }
            })
            .on('error', function (err) {
                callback(err.message || err);
            });
    });
    req.write(content);
    req.end();
};

module.exports = {
    upload,
    parseUrl,
    fetch,
    now
};