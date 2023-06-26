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

命令行工具入口脚本位于 `packages/faasit/bin/faasit.cjs`

为了方便开发，我们需要新建脚本文件 `ft`，并将脚本放入位于 PATH 目录，比如 `/usr/bin`

之后能够在任意位置使用 `ft` 命令

脚本 `ft` 内容

```bash
#!/usr/bin/env bash

# !! 修改此变量值为 Faasit 源代码目录
export FAASIT_SRC_HOME=$HOME/projects-i2ec/faasit

node $FAASIT_SRC_HOME/packages/faasit/bin/faasit.cjs "$@"
```

**运行 ft 命令行工具**

```bash
cd packages/faasit-examples/examples/nodejs-hello

# 将 DSL 转换为 IR
ft compile main.ft
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
