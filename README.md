# FaasIt

## Intro

- 在线 IDE 地址：https://try-faasit.brody715.com
- 在线 IDE 代码（基于 Github1s）：https://github.com/brody715/faasit-cloud-editor

## Quick Start

**模块下载 & 同步**

```bash
git submodule update --init --recursive
```

**安装依赖**

```sh
pnpm install
```

**以 Dev 模式转译所有包**

```sh
pnpm -r dev
```

**配置 ft 命令行工具**

命令行工具入口位于 `packages/faasit/bin/faasit.cjs`

命令行工具脚本位于 `scripts/ft`

为了方便开发，可将脚本 `scripts/ft` 路径添加到 PATH 变量中

```sh
export PATH=$PATH:"<faasit-src-dir>/scripts"
```

之后能够在任意位置使用 `ft` 命令

**运行 ft 命令行工具**

```bash
cd demo-202405/helloworld/

# 将 DSL 转换为 IR
ft eval main.ft

# 部署函数到云平台
ft deploy -p Aliyun

# 调用部署好的函数
ft invoke -p Aliyun

# 在本地运行 Function & Workflow
ft run

# 执行代码生成
ft codegen

# 新建 Function 项目目录
ft init
```

## 北大集成

### 环境配置

**前提**

密钥放在`.ssh/demo.pem`下

**Python3.10 环境**

将`deploy_pku/python.sh`复制到北大的目录下

```bash
cd deploy_pku
scp -i ~/.ssh/demo.pem python.sh root@xx.xx.xx.xx:/root
```

登录到北大服务器

```bash
bash python.sh
```

**NodeJS 环境**

```bash
cd deploy_pku
curl --location --fail https://github.com/volta-cli/volta/releases/download/v2.0.2/volta-2.0.2-linux.tar.gz --output volta-2.0.2-linux.tar.gz
scp -i ~/.ssh/demo.pem volta-2.0.2-linux.tar.gz root@xx.xx.xx.xx:/root
scp -i ~/.ssh/demo.pem volta.sh root@xx.xx.xx.xx:/root
```

登录到北大服务器

```bash
bash volta.sh
volta install node@16
volta install pnpm@8.6.0
```

**Faasit 环境**

```bash
pwd # faasit
cd ..
scp -i ~/.ssh/demo.pem -r faasit root@xx.xx.xx.xx:/root
```

登录到北大服务器

```bash
cd faasit
pnpm i 
pnpm -r dev
```

**Dockerhub**

```bash
cd deploy_pku
docker pull registry:2
docker save registry:2 -o registry.tar
scp -i ~/.ssh/demo.pem registry.tar root@xx.xx.xx.xx:/root
```

登录北大服务器`master`节点

```bash
mkdir -p dockerimage
docker load -i registry.tar
docker run --rm -d -p 5000:5000 --name registry -v /root/dockerimage:/var/lib/registry registry:2
```

使用`ip addr`获取北大`master`节点的内网IP地址，大概是`192.168.0.xxx`

然后登录北大服务器的其他`node`节点

```bash
sudo vim /etc/docker/daemon.json
```

写入以下内容

```bash
{
  "insecure-registries": ["192.168.0.xxx:5000"],
  "registry-mirrors": ["http://192.168.0.xxx:5000"]
}
```

之后重新加载一下`docker`的配置

```bash
sudo systemctl reload docker
```

可以通过下列命令测试环境是否部署成功

```bash
curl -X GET http://192.168.0.136:5000/v2/_catalog
# {"repositories":["library/redis","redis"]}
```

**PypiServer**

```bash
docker pull pypiserver/pypiserver:v2.2.0
docker save pypiserver/pypiserver:v2.2.0 -o pypi.tar
scp -i ~/.ssh/demo.pem pypi.tar root@xx.xx.xx.xx:/root
scp -i ~/.ssh/demo.pem htpasswd.txt root@xx.xx.xx.xx:/root
```

登录北大服务器

```bash
mkdir -p .pypi
docker load -i pypi.tar
docker run --rm --name pypi -d -p 12121:8080 -v ~/.pypi/:/data/packages -v ~/htpasswd.txt:/data/.htpasswd  pypiserver/pypiserver:v2.2.0 run -P .htpasswd packages
```

上传`serverless-framework`以及`faasit-runtime`

```bash
cd /root/faasit/faasit-runtime/faasit-python-runtime/pku-pkg
pip3 install wheel twine
python3 setup.py bdist_wheel
twine upload --repository-url http://localhost:12121/ dist/* -u "faasit" -p "faasit-pypi" --verbose
cd ..
python3 setup.py bdist_wheel
twine upload --repository-url http://localhost:12121/ dist/* -u "faasit" -p "faasit-pypi" --verbose
```

安装的时候只需要

```bash
pip install faasit-runtime --index-url http://localhost:12121
```

如果是在其他节点

```bash
pip install faasit-runtime --index-url http://{ip}:12121 --trust-host {ip}
```

### 应用开发

**前置**

假设已经写好了应用以及`main.ft`

**创建python虚拟环境**

```bash
python3 -m venv venv
source venv/bin/activate
pip install click
pip install faasit-runtime --index-url http://localhost:12121
```

**构建应用镜像**

```bash
ft build
```

**部署**

```bash
ft deploy
```

**调用**

```bash
ft invoke
ft invoke --file [] # 指定文件触发
```

**报错解决**

如果遇到`ft deploy`的时候输出一些奇怪的东西，则将下列代码写到跟`workflow`代码的同个目录下并命名为`driver.py`

```python
import json
import os
os.environ["FAASIT_PROVIDER"]="pku"
from index import handler
output = handler()
print(output)
```

然后运行`driver.py`根据报错提示修改

## Development

### Conventions

1. 开发工具

   - pnpm
   - unbuild
   - volta

2. 使用 Pnpm 的原因
   - 原生支持 [Monorepo 项目架构](https://monorepo.tools/)
   - 依赖安装速度快

## Credits

The project is based on https://github.com/cdietrich/xtext-languageserver-example.git
