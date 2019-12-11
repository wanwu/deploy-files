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
 

## Reference

- https://github.com/fex-team/fis3-deploy-http-push
