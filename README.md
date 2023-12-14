# FaasIt

## Intro

- 在线 IDE 地址：https://try-faasit.brody715.com
- 在线 IDE 代码（基于 Github1s）：https://github.com/brody715/faasit-cloud-editor

## Quick Start

**安装依赖**

```sh
pnpm install
```

**以 Dev 模式转译所有包**

```sh
pnpm -r dev
```

**配置 ft 命令行工具**

命令行工具入口位于 `packages/faasit/bin/faasit.cjs`

命令行工具脚本位于 `scripts/ft`

为了方便开发，可将脚本 `scripts/ft` 路径添加到 PATH 变量中

```sh
export PATH=$PATH:"<faasit-src-dir>/scripts"
```

之后能够在任意位置使用 `ft` 命令

**运行 ft 命令行工具**

```bash
cd packages/faasit-examples/examples/nodejs-hello

# 将 DSL 转换为 IR
ft eval main.ft

# 部署函数到云平台
ft deploy

# 调用部署好的函数
ft invoke

# 在本地运行 Function & Workflow
ft run

# 执行代码生成
ft codegen

# 新建 Function 项目目录
ft init
```

## Development

### Conventions

1. 开发工具

   - pnpm
   - unbuild
   - volta

2. 使用 Pnpm 的原因
   - 原生支持 [Monorepo 项目架构](https://monorepo.tools/)
   - 依赖安装速度快

## Credits

The project is based on https://github.com/cdietrich/xtext-languageserver-example.git
