const fs = require('fs');
const glob = require('glob');
const upload = require('../fsr');

/** Here is a demo */
glob(`${process.cwd()}/output/**`, function (er, files) {
    let targetFiles = files.filter(filepath => {
        console.log({filepath});
        const stats = fs.statSync(filepath);
        return stats.isFile();
    });

    targetFiles = targetFiles.map(filepath => {
        const content = fs.readFileSync(filepath);
        return {
            releasePath: /\.tpl$/.test(filepath) ? '' : '/nginx.static/htdocs',
            content: fs.readFileSync(filepath),
            subpath: filepath.split('output/')[1]
        };
    });

    upload({
        host: 'YOUR_HOST',
        to: 'YOUR_PATH',
        retry: 2
    }, targetFiles, () => {
        console.log('\n');
        console.log('UPLOAD MISSION COMPLETE!')
    });
});