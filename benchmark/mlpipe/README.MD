### 机器学习Benchmark

机器学习应用作为一个离线的应用，主要分为了几个步骤，数据集加载，训练，验证

- `preprocess`负责预加载数据
- `train`函数负责模型训练，并输出模型
- `test`接收模型以及数据集，并验证模型

#### 数据生成

- 可以通过

```bash
cd data
python data_fetch.py 100
```

抓取前100条机器学习的数据集，可根据需要适当调整参数大小

#### knative

- 通过`ft build -p kn`构建镜像
- 通过`ft deploy -p kn`部署`knative`服务
    - 资源配置可以通过修改`main.ft`中的`resource`字段，根据实际主机配置设定
    - 可以通过`kubectl get ksvc`查看各个服务的状态，只有ready为`True`时才可以调用
- 通过`ft invoke -p kn`执行

#### 阿里云

- 在阿里云上创建`numpy`以及`scikit_learn`的镜像层
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