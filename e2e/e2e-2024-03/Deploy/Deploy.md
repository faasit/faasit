## 功能测试

- 阿里云函数部署

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