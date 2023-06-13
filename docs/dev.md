## Project Sturecture

### @faasit/core

**用途**

- 定义 AST 对象，语义对象
- 定义关键数据结构，如 LangPlugin 定义
- 实现语言功能，如 TypeService 和 Validator

**运行环境**

- NodeJs
- Browser

### @faasit/cli

**用途**

- 提供命令行工具
- 组合 `@faasit/core` 提供的语言服务，实现功能

**运行环境**

- NodeJs

### @faasit/vscode-extension

**用途**

- 组合 `@faasit/core` 提供的语言服务，实现 Language Server
- 提供 VSCode 插件
- 提供 Monaco 插件

### @faasit/plugins

**用途**

- 实现一些内置的插件
- 插件可用于代码生成、不同云平台的云函数部署等功能

### @faasit/cloud-editor

**用途**

- 提供云端编辑器，集成 Monaco Editor
- 提供云端的语言服务，基于 `@faasit/core` 和 `@faasit/vscode-extension` 实现
