## 功能测试

> 测试后记得删掉原来的测试环境

- 阿里云函数部署

```bash
cd func && ft deploy -p Aliyun
```

![alt text](../assets/Deploy/image-8.png)

- 阿里云函数更新

```bash
cd func && ft deploy -p Aliyun
```

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

![alt text](../assets/Deploy/image-1.png)


- AWS 函数部署

```bash
cd func && ft deploy -p aws
```

![alt text](../assets/Deploy/image-14.png)

- AWS 函数更新

```bash
cd func && ft deploy -p aws
```

![alt text](../assets/Deploy/image-14.png)


- 本地函数部署

```bash
cd func && ft deploy -p Local
```

![alt text](../assets/Deploy/image-2.png)

- 本地函数流部署

```bash
cd dag-wordcount && ft deploy -p Local
```

![alt text](../assets/Deploy/image-4.png)


---

- 阿里云函数调用

```bash
cd func && ft invoke -p Aliyun
```

- 阿里云函数流调用

```bash
cd dag-wordcount && ft invoke -p Aliyun -f __executor
```

![alt text](../assets/Deploy/image-7.png)

![alt text](../assets/Deploy/image-6.png)

- AWS 函数调用

```bash
cd func && ft invoke -p aws
```

![alt text](../assets/Deploy/image-15.png)









- 本地函数调用


```bash
cd func && ft invoke -p Local
```

![alt text](../assets/Deploy/image-3.png)


- 本地函数流调用

```bash
ft invoke -p Local -f executor
```

![alt text](../assets/Deploy/image-5.png)

---
- 触发器部署

```bash
cd trigger && ft deploy
```

![alt text](../assets/Deploy/image-10.png)


- 触发器更新

```bash
cd trigger && ft deploy
```

![alt text](../assets/Deploy/image-11.png)

---

- 本地`javascript`函数运行

```bash
cd func && ft run
```

![alt text](../assets/Deploy/image-16.png)


- 本地`javascript`函数流运行

```bash
cd dag-wordcount && ft run
```

![alt text](../assets/Deploy/image-17.png)

- 本地`python`函数运行

```bash
cd python/demo1 && ft run
```

![alt text](../assets/Deploy/image-12.png)


- 本地`python`函数流执行

```bash
cd python/demo2 && ft run
```

![alt text](../assets/Deploy/image-13.png)