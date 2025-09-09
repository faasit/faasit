### Web应用Benchmark

Web 应用作为一个在线服务，模拟了大量用户同时发起请求的应用场景，
其中请求主要包括登录请求，获取自己粉丝的请求，用户的更新请求，
最后统计了用户的请求次数并把所有的响应结果

- `init.InitUserAndPost` 函数模拟了用户数据信息的加载，其中加载的参数可以由`max_users`控制
- `request.Request` 函数模拟了用户的随机请求
- `userlogin.UserLogin` 函数模拟了用户的登录请求
- `getprofile.ProfileFollers` 函数模拟了用户获取自己的粉丝的请求
- `post.Post` 函数模拟了用户的更新操作
- `timeline.Timeline` 函数统计了所有用户的请求次数
- `collect.CollectResult` 汇集了所有请求的响应结果

#### knative

- 通过`ft build -p kn`构建镜像
- 通过`ft deploy -p kn`部署`knative`服务
    - 资源配置可以通过修改`main.ft`中的`resource`字段，根据实际主机配置设定
    - 可以通过`kubectl get ksvc`查看各个服务的状态，只有ready为`True`时才可以调用
- 通过`ft invoke -p kn`执行

#### k8s

- 通过`ft build -p k8s`构建镜像
- 通过`ft deploy -p k8s`部署服务
    - 资源配置可以通过修改`main.ft`中的`resource`字段，根据实际主机配置设定
    - 可以通过`kubectl get pods`查看各个服务的状态，只有全部都是`running`时才可以调用
- 通过`ft invoke -p k8s`执行

#### 阿里云

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