### 大数据应用Benchmark

大数据应用Wordcount是一个离线应用，将数据集分为几个子模块进行处理

- `split`将数据集分为了几个子模块
- `mapper`函数分别统计了每个模块的词频
- `reduce`函数将结果进行汇总

#### 数据生成

- 可以通过

```bash
cd data
python data_generate.py 10
```

生成10MB的大小的随机数据，可以根据实际调整数据集大小

#### knative

- 通过`ft build -p kn`构建镜像
- 通过`ft deploy -p kn`部署`knative`服务
    - 资源配置可以通过修改`main.ft`中的`resource`字段，根据实际主机配置设定
    - 可以通过`kubectl get ksvc`查看各个服务的状态，只有ready为`True`时才可以调用
- 通过`ft invoke -p kn --example 0`执行

#### 阿里云

- 先通过`data/data_upload.py`将数据集上传到阿里云的oss中
- 通过`ft build -p ali`将依赖包下载到代码目录下
- 通过`ft deploy -p ali`将几个函数部署到阿里云函数计算FC上
- 通过`ft invoke -p ali`执行

注意：可以通过在`@provider`块中设置调用的超时时间，因为阿里云默认的调用时间是3s，很大可能会直接
超时

```
@provider ali {
    kind = 'aliyun'
    invoke = {
        timeout = "50000"
    }
}
```