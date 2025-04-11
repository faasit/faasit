### 大数据应用Benchmark

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


