## 函数使用说明

### Python环境依赖安装

- 请确保已经安装了Python3以及相关依赖

```shell
pip3 install -t requirements.txt
```

### 环境变量

1. 获取`AccessKey ID`以及`AccessKey Key`

登录阿里云账号并在个人信息中的`AccessKey 管理`的地方获取自己的`AccessKey ID`以及`AccessKey Key`

2. 获取`endpoint`

`endpoint`的格式为`账号名.地域名.fc.aliyuncs.com`

例如`1380866445961825.cn-hangzhou.fc.aliyuncs.com`

3. 创建`.env`文件

在每个函数代码包中创建`.env`文件，将刚才获得的环境变量写入里头，变量命名格式为

```.env
ACCESS_ID=xxxxx
ACCESS_KEY=xxxxx
ENDPOINT=xxxxx
```

### 运行代码

1. 创建服务

```shell
cd CreateService
python3 1.py
```

2. 创建函数

```shell
cd CreateFunction
python3 1.py
```

3. 创建触发器

```shell
cd CreateTrigger
python3 1.py
```

4. 调用函数

```shell
cd InvokeFunction
python3 1.py
```