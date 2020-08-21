const fs = require('fs');
const path = require('path');
const colors = require('colors');
const Url = require('url');
const prompt = require('prompt');
const util = require('./util');

prompt.start();

function upload(receiver, to, data, release, content, file, callback) {
    let subpath = file.subpath;
    data.to = path.join(file.to, subpath);
    util.upload({
            receiver,
            data,
            content,
            subpath
        },
        function (err, res) {
            let json = null;
            res = res && res.trim();

            try {
                json = res ? JSON.parse(res) : null;
            } catch (e) {}

            if (!err && json && json.errno) {
                callback(json);
            } else if (err || !json && res != '0') {
                callback('upload file [' + subpath + '] to [' + data.to + '] by receiver [' + receiver + '] error [' + (err || res) + ']');
            } else {
                let time = '[' + util.now(true) + ']';
                process.stdout.write(
                    '\n - '.green.bold +
                    time.grey + ' ' +
                    subpath.replace(/^\//, '') +
                    ' >> '.yellow.bold +
                    data.to
                );
                callback();
            }
        }
    );
}

function requireEmail(authApi, validateApi, info, cb) {
    prompt.get({
        properties: {
            email: {
                pattern: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
                message: 'The specified value must be a valid email address.',
                description: 'Enter your email',
                required: true,
                default: info.email
            }
        }
    }, function (error, ret) {
        if (error) {
            return cb(error);
        }

        info.email = ret.email;
        deployInfo(info);

        util.fetch(authApi, {
            email: ret.email
        }, function (error, ret) {
            if (error) {
                return cb(error);
            }

            console.log('We\'re already sent the code to your email.')

            requireToken(validateApi, info, cb);
        });
    })
}

function requireToken(validateApi, info, cb) {
    prompt.get({
        properties: {
            code: {
                description: 'Enter your code',
                required: true,
                hide: true
            }
        }
    }, function (error, ret) {
        if (error) {
            return cb(error);
        }

        info.code = ret.code;
        deployInfo(info);

        util.fetch(validateApi, {
            email: info.email,
            code: info.code
        }, function (error, ret) {
            if (error) {
                return cb(error);
            }

            info.token = ret.data.token;
            deployInfo(info);
            cb(null, info);
        });
    })
}

function getTmpFile() {
    const dir = require('os').homedir() + '/.deploy-tmp';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    return dir + '/deploy.json';
}

function deployInfo(options) {
    let conf = getTmpFile();

    if (arguments.length) {
        // setter
        return options && fs.writeFileSync(conf, JSON.stringify(options, null, 2));
    } else {
        let ret = null;

        try {
            // getter
            ret = fs.existsSync(conf) ? require(conf) : null;
        } catch (e) {

        }
        return ret;
    }
};

module.exports = function (modified, options, callback) {
    if (!options.to) {
        // throw new Error('options.to is required!');
    }

    let info = deployInfo() || {};
    let to = options.to;
    let receiver = options.receiver;
    let authApi = options.authApi;
    let validateApi = options.validateApi;
    let data = options.data || {};

    if (options.host) {
        receiver = options.receiver = options.host + '/v1/upload';
        authApi = options.authApi = options.host + '/v1/authorize';
        validateApi = options.validateApi = options.host + '/v1/validate';
    }

    if (!options.receiver) {
        throw new Error('options.receiver is required!');
    }

    let steps = [];

    modified.forEach(file => {
        let reTryCount = options.retry;

        steps.push(function (next) {
            /*eslint-disable */
            let $$upload = arguments.callee;
            /* eslint-enable */
            data.email = info.email;
            data.token = info.token;

            upload(receiver, to, data, file.releasePath, file.content, file, error => {
                if (!error) {
                    next();
                    return;
                }
                if (error.errno === 100302 || error.errno === 100305) {
                    // 检测到后端限制了上传，要求用户输入信息再继续。
                    if (!authApi || !validateApi) {
                        throw new Error('options.authApi and options.validateApi is required!');
                    }

                    if (info.email) {
                        console.error('\nToken is invalid: ', error.errmsg, '\n');
                    }

                    requireEmail(authApi, validateApi, info, function (error) {
                        if (error) {
                            throw new Error('Auth failed! ' + error.errmsg);
                        } else {
                            $$upload(next);
                        }
                    });
                } else if (options.retry && !--reTryCount) {
                    throw new Error(error.errmsg || error);
                } else {
                    $$upload(next);
                }

            });
        });
    });

    steps.reduceRight((next, current) => {
        return () => {
            current(next);
        };
    }, callback)();
};
