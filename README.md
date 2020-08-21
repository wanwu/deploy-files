# deploy-files

使用node上传文件到远程机器

## 代码说明

- index.js 普通上传
- fsr.js 使用邮箱验证的安全方式上传
- webpack-plugin.js webpack插件

## webpack.config.js配置

### 增加deployMap字段

```
{
  ...
  
  deployMap: {
     sandbox: {
         receiver: 'http://YOUR_HOST/receiver',
         templatePath: '/home/work/nginx_static/html/test/template',
         staticPath: '//home/work/nginx_static/html/test/static',
         staticDomain: 'http://test.com:8888'
     },
     sandbox2: {
         ...
     } 
  },
 ...
}
 ```

## 服务端配置

把[receiver.php](https://gist.github.com/jinzhan/131858820f998acca568b374dcfd88e2)，部署到远程机器，并保证`receiver.php`能被正常访问


直接访问`http://YOUR_HOST/YOUR_PATH/receiver.php`时，页面应该显示这行字

```
I'm ready for that, you know.
```

## Reference

- https://github.com/fex-team/fis3-deploy-http-push
