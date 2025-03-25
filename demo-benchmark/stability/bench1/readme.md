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
- 模型类型：表示负载生成的模型类型，例如 Uniform 表示均匀分布。
- 模式：表示负载生成的模式，例如 0 表示按时间持续生成，1 表示按次数生成。
- 主参数：根据模式的不同，含义也不同。
    - 如果模式为 0，主参数表示持续时间（秒）。
    - 如果模式为 1，主参数表示总次数。
- 模型参数：根据模型类型的不同，含义也不同。
    - Uniform
        - minInterval：生成负载的最小时间间隔（秒）。
        - maxInterval：生成负载的最大时间间隔（秒）（可选，默认等于minInterval）。
    - Poisson
        - lambda：泊松分布的平均到达率（每秒事件数）。
    - ONOFF
        - onDuration：负载生成的“开”状态持续时间（秒）。
        - offDuration：负载生成的“关”状态持续时间（秒）。
        - minInterval：生成负载的最小时间间隔（秒）。
        - maxInterval：生成负载的最大时间间隔（秒）。
    - AR
        - phi：自回归系数，|phi| < 1。
        - scale：噪声强度，用于控制间隔时间的波动幅度。
        - minInterval：生成负载的最小时间间隔（秒）。
        - maxInterval：生成负载的最大时间间隔（秒）。
    - StepLoad
        - stepDuration：阶段持续时间（秒）。
        - stepIncrement：每阶段请求速率（RPS）的增量。
        - baseRPS（可选）：起始请求速率（RPS），默认值为 0。
        - intervalMode（可选）：间隔生成模式，0 表示固定间隔（fixed），1 表示随机均匀分布（random），默认值为 fixed。
    - Gamma
        - shape：形状参数
        - scale：尺度参数
        - minInterval：最小间隔时间（秒）
        - maxInterval（可选）：最大间隔时间（秒），默认值为minInterval

