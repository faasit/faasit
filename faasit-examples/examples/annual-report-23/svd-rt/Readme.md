

## Intro

本实例演示了如何使用 Faasit 编写 Serverless 应用，并部署、运行到多个云平台

支持的云平台

- Knative
- AWS Lambda
- Alibaba Function Compute

## Usage

1. 安装 Faasit

见 Faasit 项目 [Readme.md](https://github.com/brody715/faasit/tree/main)

2. 安装依赖

进入 svd-rt/javascript 目录，执行 npm install

如果 npm install 失败，需要删除 svd-rt/javascript/node_modules 后重新安装

3. 配置环境变量

复制 `env.template` 到 `.env`，并修改其中的配置

4. 部署

```bash
ft deploy -p knative
ft deploy -p aws
ft deploy --provider aliyun  # -p/--provider: specify the provider
```

5. 调用

```bash
ft invoke -p aws
ft invoke -p knative --example 1 # --example: specify invoke data example, default example=0
ft invoke -p aliyun
```
