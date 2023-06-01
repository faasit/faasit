# 简介

使用node调用腾讯云SCF API的简单示例程序，利用了官方的SDK。

# 注意事项

1. 本示例独立于faasit项目，请单独打开此文件夹（即`provider-examples/tencentyun`），并使用npm或pnpm安装相关依赖：

```
pnpm i
```

2. 本示例利用了config包来配置环境变量，若要进行测试，请将`config/default.json`中的属性改成自己腾讯云账号的（示例秘钥已禁用）；
3. 配置完成后，即可运行`function`和`trigger`目录下的每个js文件进行函数和触发器管理。运行时请注意参数和自己账号的实际情况，如删除函数时，请检查自己账号该函数是否存在。