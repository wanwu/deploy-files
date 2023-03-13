# deploy-files

使用node上传文件到远程机器

## 代码说明

- index.js 普通上传
- fsr.js 使用邮箱验证的安全方式上传
- webpack-plugin.js webpack插件
- upload.js node使用上传插件，包含普通上传和fsr上传

## 配置

### webpack.config.js增加deployMap字段

```
{
  ...
  
  deployMap: {
     sandbox: {
         receiver: 'http://YOUR_HOST/receiver',
         templatePath: '/home/work/nginx_static/html/test/template',
         templateSuffix: '.html', // 模板后缀，不配置默认使用.tpl，也可传入'.(san|html)'
         staticPath: '//home/work/nginx_static/html/test/static',
         staticDomain: 'http://test.com:8888',
         throttle: 200 // 文件上传的延迟时间，默认为200ms
     },
     sandbox2: {
         ...
     } 
  },
 ...
}
 ```

### upload.js 使用

```js
// 实例化
const upload = new Upload({
    disableFsr: false, // 默认启用fsr 默认false
    host: 'http://host.com',
    receiver: 'http://xxx.com:8xxx/receiver',
    to: 'dest', // 目标机器路径
    files: [{[filenam]: [sourceCode]}], // 文件对象
    replace: [{from:'a', to:'b'}, {from: new RegExp('oldCDN', 'ig'), to: 'newCDN'}] // 替换内容
});

// 开始上传
upload.run();

```

### 服务端配置

把[receiver.php](https://gist.github.com/jinzhan/131858820f998acca568b374dcfd88e2)，部署到远程机器，并保证`receiver.php`能被正常访问


直接访问`http://YOUR_HOST/YOUR_PATH/receiver.php`时，页面应该显示这行字

```
I'm ready for that, you know.
```

## 常见问题

1. Error：部署token已过期

```
执行：  rm ~/.deploy-tmp/deploy.json，删除本地缓存文件即可。
```




## Reference

- https://github.com/fex-team/fis3-deploy-http-push
