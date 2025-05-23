# FaasIt

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

## knative 集成

### 环境配置

#### 前提

- Docker

#### k8s 环境搭建

- 网络配置

```bash
sudo apt-get install -y selinux-utils
sudo setenforce 0
sudo ufw disable
sudo swapoff -a
sudo modprobe br_netfilter


echo "net.bridge.bridge-nf-call-ip6tables = 1" | sudo tee -a /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-iptables = 1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
```



- 使用阿里云的镜像构建k8s


```bash
sudo apt-get update && sudo apt-get install -y apt-transport-https
curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | sudo apt-key add -
```

- 将阿里云的镜像地址写到`sources.list`中

```bash
sudo vim /etc/apt/sources.list.d/kubernetes.list

# 写入下列内容
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
```

- 安装特定版本的k8s

```bash
sudo apt-get update
sudo apt-get install -y kubelet==1.27.0-00 kubeadm==1.27.0-00 kubectl==1.27.0-00
```


- 安装`cri-dockered`插件

```bash
wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.3.4/cri-dockerd-0.3.4.amd64.tgz
tar xvf cri-dockerd-0.3.4.amd64.tgz
sudo mv cri-dockerd/cri-dockerd /usr/local/bin/

wget https://raw.githubusercontent.com/Mirantis/cri-dockerd/master/packaging/systemd/cri-docker.service
wget https://raw.githubusercontent.com/Mirantis/cri-dockerd/master/packaging/systemd/cri-docker.socket
sudo mv cri-docker.* /etc/systemd/system/
sudo systemctl daemon-reload

sudo systemctl enable cri-docker.service
sudo systemctl enable --now cri-docker.socket
```


- `kubeadm-config.yaml`配置

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.28.220 # 自行修改
  bindPort: 6443
nodeRegistration:
  criSocket: /var/run/cri-dockerd.sock
  imagePullPolicy: IfNotPresent
  name: cloud
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.aliyuncs.com/google_containers
kind: ClusterConfiguration
kubernetesVersion: 1.27.0
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16
scheduler: {}
```

- 启动k8s集群

```bash
sudo kubeadm init --config kubeadm-config.yaml

sudo mkdir -p .kube/config
sudo cp -i /etc/kubernetes/admin.conf .kube/config
sudo chown $(id -u):$(id -g) .kube/config
```

#### knative 环境搭建

```bash
kubectl taint node epyc node-role.kubernetes.io/control-plane-

kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.4/serving-crds.yaml

kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.4/serving-core.yaml

kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.12.3/kourier.yaml

kubectl patch configmap/config-network \
--namespace knative-serving \
--type merge \
--patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'


kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.4/serving-default-domain.yaml


# 10.0.0.233 is an arbitary choice.EXTERNAL_IP="10.0.0.233"
# To get rid of the strange rules that default urls *.svc.cluster.local cannot be accessed from outside network. 
# sslip can avoid us from trouble of manipulating DNS record.
export EXTERNAL_IP=10.0.0.233
kubectl patch configmap/config-domain \--namespace knative-serving \--type merge \--patch "{\"data\":{\"$EXTERNAL_IP.sslip.io\":\"\"}}"

kubectl patch svc kourier -n kourier-system -p "{\"spec\": {\"type\": \"LoadBalancer\", \"externalIPs\": [\"$EXTERNAL_IP\"]}}"
```

- 验证外部IP

```bash
kubectl --namespace kourier-system get service kourier
```

#### 私有pypi服务器搭建

```bash
docker pull pypiserver/pypiserver:v2.2.0
mkdir -p ~/.pypi
cp deploy_pku/htpasswd.txt ~
docker run --restart always --name pypi -d -p 12121:8080 -v ~/.pypi/:/data/packages -v ~/htpasswd.txt:/data/.htpasswd  pypiserver/pypiserver:v2.2.0 run -P .htpasswd packages
```

#### 私有镜像仓库搭建


```bash
docker pull registry:2
docker run --restart always -d -p 5000:5000 --name registry -v /root/dockerimage:/var/lib/registry registry:2
```


#### 镜像faasit-runtime 构建

- 上传`faasit-runtime`
```bash
cd faasit-runtime/faasit-python-runtime
bash build.sh
```

- 构建镜像
```bash
cd faasit/faasit-docker/kn

# 可自行修改build.sh中的版本信息
bash build.sh
```




## 阿里云集成

- 通过阿里云账户得到如下信息并写到环境变量中

```bash
export FAASIT_SECRET_ALIYUN_ACCOUNT_ID=176xxxxxxxxx
export ALIBABA_CLOUD_OSS_BUCKET_NAME=faasit
export ALIBABA_CLOUD_OSS_REGION=oss-cn-hangzhou
export FAASIT_SECRET_ALIYUN_ACCESS_KEY_ID=LTAxxxxxxxxxxxxxxxx
export FAASIT_SECRET_ALIYUN_ACCESS_KEY_SECRET=o3vxxxxxxxxxxxxxxxxx
export FAASIT_SECRET_ALIYUN_REGION=cn-hangzhou
```


## 北大集成

### 线下环境配置

**前提**

- Python3.10以上的环境
- Docker

#### faasit-runtime运行时环境

**方案1：自己构建faasit-runtime**

- 搭建私有pypi服务器

```bash
docker pull pypiserver/pypiserver:v2.2.0
mkdir -p ~/.pypi
cp deploy_pku/htpasswd.txt ~
docker run --rm --name pypi -d -p 12121:8080 -v ~/.pypi/:/data/packages -v ~/htpasswd.txt:/data/.htpasswd  pypiserver/pypiserver:v2.2.0 run -P .htpasswd packages
```

- 构建faasit-runtime并上传(可能需要下载wheel,twine等工具，遇到了自己`pip install`即可)

```bash
cd faasit-runtime/faasit-python-runtime
bash build.sh
```

- 之后在pip的install路径下添加一下`localhost:12121`(自行gpt查一下)

**方案2：使用已有的faasit-runtime**

其实我们已经在[pypi](https://pypi.org)上传了`faasit-runtime`


#### faasit-spilot镜像构建

```bash
cd faasit-docker/spilot/0.6
docker build --no-cache -t faasit-spilot:0.6 
```

如果上面使用`faasit-runtime`使用的是我们上传的运行时环境，就把`pip install`那一步的后面的url删掉即可

### 线上环境配置

**前提**

密钥放在`.ssh/demo.pem`下

#### Python3.10 环境

将`deploy_pku/python.sh`复制到北大的目录下

```bash
cd deploy_pku
scp -i ~/.ssh/demo.pem python.sh root@xx.xx.xx.xx:/root
```

登录到北大服务器

```bash
bash python.sh
```

#### NodeJS 环境

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

#### Faasit 环境

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

#### Dockerhub

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

#### PypiServer

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

#### CodeServer

下载`code-server`并上传

```bash
wget https://github.com/coder/code-server/releases/download/v4.96.1/code-server_4.96.1_amd64.deb
scp -i ~/.ssh/demo.pem code-server_4.96.1_amd64.deb pkualiyun:/coder
```

登录北大服务器

```bash
useradd -mG sudo coder
passwd coder
# faasitcoder
visudo
# add below
# coder  ALL=(ALL:ALL)  NOPASSWD:   ALL
chsh coder -s /bin/bash
dpkg -i /home/coder/code-server_4.96.1_amd64.deb
vim /home/coder/.config/code-server/config.yaml
# 写入下列内容
bind-addr: 0.0.0.0:8080
auth: password
password: faasit-code
cert: false

vim /lib/systemd/system/code-server\@.service
# 写入下列内容
[Unit]
Description=code-server
After=network.target

[Service]
Type=exec
ExecStart=/usr/bin/code-server /home/coder/projects
Restart=always
User=%i

[Install]
WantedBy=default.target


systemctl daemon-reload
systemctl restart code-server@coder
```



### 应用开发

**前置**

假设已经写好了应用以及`main.ft`

#### `main.ft`

- `@function`表示一个函数体，随后跟着函数名称，该函数名称是Serverless应用中对于每个函数的标识符

```python
@function hello {
   runtime = "python" # 运行时
   codeDir = "./code" # 代码所在的目录
   handler = "index.hello" # 响应请求的文件以及对应的函数名称，注意这里指的是Python文件中的名称
}
```

- `@provider`是云平台的一个概念，可以描述不同的部署方式

```python
@provider pku {
   kind = 'pku' # 指定部署平台为pku
   deployment = {} # 指定部署参数，根据具体情况而定
   invoke = {} # 调用参数，对应的`python -m serverless_framework.controller`后跟着的参数
}
```

- `@application`是一个应用的概念

```python
@application helloapp {
   functions = [hello] # 这个应用所包含的函数
   defaultProvider = pku # 默认部署平台
   providers = [pku] # 支持的部署平台
   inputExamples = [ # 应用参数
      {
         value = {
            ...
         }
      }
   ]
}
```

#### Python应用开发

- 开发示例

```python
from faasit_runtime import function, workflow, Workflow, FaasitRuntime # 导入统一运行时环境

@function # 定义一个Serverless函数
def hello(frt: FaasitRuntime): # 统一运行时参数
   _in = frt.input() # 函数输入
   result = frt.call('hello2', {'a': _in['a']}) # 函数通信，调用另一个函数，其中参数为{'a': _in['a']}
   return frt.output(result) # 函数返回

@function
def hello2(frt: FaasitRuntime):
   return frt.output({"message":"ok"})

hello = hello.export() # 导出函数到云平台, 这里变量的名称可以自定义，但是要注意跟`main.ft`中的handler定义相对应
hello2 = hello2.export() 
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
