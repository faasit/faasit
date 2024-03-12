## 功能测试

1. 解析 Faasit 代码为抽象语法树

```sh
ft parse func/func_parse_ok.ft
```

2. Faasit 代码语法错误检查

```sh
ft parse func/func_parse_failed.ft
```

3. 解析Faasit代码为JS IR 对象

4. JS IR 对象还原为Faasit对象

5. 解析Faasit代码为Value API对象

6. 添加变量/函数等存储在符号表中

7. 尝试重复定义相同的符号，符号表能够正确地检测到重复定义

8. 实现本地包导入

9. 不能导入一个不存在的包

10. 自定义类型

11. 自动检测不兼容的变量

12. Javascript 事件定义代码生成

```sh
ft codegen func_codegen_def.ft
```

13. Javascript 事件类型代码生成

```sh
ft codegen func_codegen_types.ft
```

14. 自动补全包导入路径

```sh
code func_auto_import.ft
```

15. Faasit 代码格式化

```sh
ft fmt -p func_fmt.ft
```

16. Faasit 代码语法高亮

```sh
code func_syntax_highlight.ft
```

17. Faasit 代码错误提示

```sh
code func_error_hint.ft
```

18. Faasit 代码悬浮提示

```sh
code func_hover_hint.ft
```

# 性能测试

1. 编译器语法分析模块

```sh
ft --dev_perf parse perf_parse.ft
```

2. 编译器代码生成模块

```sh
ft --dev_perf codegen perf_codegen.ft
```

3. 语言服务模块

```sh
ft --dev_perf codegen perf_fmt.ft
```