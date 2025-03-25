本文主要介绍 LoadConfig 的使用

bench.ts 会读取 ./LoadConfig/LoadConfig.txt （即配置文件）的内容，然后生成相应的负载

配置文件的格式如下：
```conf
# 时间(s) 模型类型 模式 主参数 [模型参数...]
0 Uniform 0 12 1 4 
# 持续12秒，间隔1~4秒
15 Uniform 1 5 2
# 总共5次，间隔2秒
```

- 时间(s)：表示从开始到执行该行的时间
