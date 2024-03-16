## 功能测试

- 阿里云函数部署

```bash
cd func && ft deploy -p Aliyun
```

![alt text](../assets/Deploy/image-8.png)

- 阿里云函数更新

```bash
cd func && ft deploy -p Aliyun
```

![alt text](../assets/Deploy/image-1.png)

- 阿里云函数调用

```bash
cd func && ft invoke -p Aliyun
```

![alt text](../assets/Deploy/image-6.png)


- 阿里云函数流部署

```bash
cd dag-wordcount && ft deploy -p Aliyun
```

![alt text](../assets/Deploy/image-9.png)

- 阿里云函数流更新

```bash
cd dag-wordcount && ft deploy -p Aliyun
```

![alt text](../assets/Deploy/image.png)

- 阿里云函数流调用

```bash
cd dag-wordcount && ft invoke -p Aliyun -f __executor
```

![alt text](../assets/Deploy/image-7.png)

- 本地函数部署

```bash
cd func && ft deploy
```

![alt text](../assets/Deploy/image-2.png)

- 本地函数调用


```bash
cd func && ft invoke
```

![alt text](../assets/Deploy/image-3.png)

- 本地函数流部署

```bash
cd dag-wordcount && ft deploy
```

![alt text](../assets/Deploy/image-4.png)

- 本地函数流调用

```bash
ft invoke -p Local -f executor
```

![alt text](../assets/Deploy/image-5.png)


- 触发器创建

```bash
cd trigger && ft deploy
```

![alt text](../assets/Deploy/image-10.png)


- 触发器更新

```bash
cd trigger && ft deploy
```

![alt text](../assets/Deploy/image-11.png)



- 本地函数运行

```bash
cd python/demo1 && ft run
```

![alt text](../assets/Deploy/image-12.png)


- 本地函数流执行

```bash
cd python/demo2 && ft run
```

![alt text](../assets/Deploy/image-13.png)