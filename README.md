# XX 电子商务系统（K8s Mall）

一个跑在轻量级 K3s 集群上的电商系统：React 前端 + Spring Boot 后端 + MySQL/Redis + APISIX 网关，覆盖用户下单全流程和基础的后台管理能力。

## 目录

- [功能架构](#功能架构)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [部署到远程服务器](#部署到远程服务器)
- [常见问题](#常见问题)

---

## 功能架构

```
XX电子商务系统
├── 用户端
│   ├── 首页（轮播广告 + 分类导航 + 推荐商品）
│   ├── 商品列表（分类筛选 / 关键词搜索）
│   ├── 商品详情（SKU 选择、规格参数、图文详情）
│   ├── 购物车（勾选结算、数量调整）
│   ├── 注册 / 登录（邮箱验证码校验，注册成功自动登录）
│   └── 结算下单（生成订单、扣减库存）
└── 管理端（网页 UI，登录后访问 /admin）
    ├── 商品管理（含主图/主视频上传，上传到自建 MinIO 对象存储）
    ├── 分类管理
    ├── 广告管理（含广告类别）
    ├── 订单管理（查看 + 修改订单状态）
    └── 用户管理（查看 + 启用/禁用账号）
```

管理端登录入口与普通用户共用 `/login`，登录账号的角色为 `ADMIN` 时会自动跳转到 `/admin`；普通用户访问 `/admin` 会被重定向回登录页。数据库初始化脚本（[sql/init.sql](sql/init.sql)）已内置一个默认管理员账号：

| 用户名 | 密码 | 说明 |
|---|---|---|
| `admin` | `admin123` | **务必在生产环境部署后立即登录修改密码**（后台暂未提供改密功能，需直接更新数据库 `t_user` 表的 `password` 字段，存的是 BCrypt 哈希） |

核心业务流程：

```
浏览商品 → 加入购物车 → 勾选结算 → 填写收货信息 → 提交订单
                                          ↓
                              后端事务内扣减 SKU/商品库存
                                          ↓
                              生成订单号，订单状态 = 待支付
```

---

## 系统架构

```
用户浏览器
    ↓ HTTPS / TLS
Gateway API（APISIX）
├── WAF 防护（ModSecurity 规则）
├── 限流 / API Key 鉴权
└── 路由规则（/api → 后端，/ → 前端）
    ↓
┌─────────────────────────────────────────────────────┐
│                   K3s Cluster                        │
│                                                      │
│  ┌─ Service：前端 ──────────────────────────────┐   │
│  │  前端 Pod（React+Nginx）× N   ← HPA 扩容     │   │
│  └──────────────────────────────────────────────┘   │
│                  ↓ Network Policy 放行               │
│  ┌─ Service：后端 ──────────────────────────────┐   │
│  │  后端 Pod（Spring Boot+JWT）× N ← HPA 伸缩   │   │
│  │           CPU 阈值 50% 触发扩容               │   │
│  └──────────────────────────────────────────────┘   │
│            ↓              ↓              ↓          │
│  ┌─ MySQL ─┐  ┌─ Redis ──┐  ┌─ MinIO ─────────┐    │
│  │ Pod × 1 │  │ Pod × 1  │  │ Pod × 1         │    │
│  │ + PVC   │  │ 缓存层   │  │ + PVC 对象存储  │    │
│  └─────────┘  └──────────┘  │ 商品图片/视频   │    │
│                              └─────────────────┘    │
│                                                      │
│  Secret → DB密码 / JWT密钥 / 邮箱SMTP / MinIO密钥 / TLS证书 │
│  Pod Security Standard（restricted）→ 禁止特权容器  │
│  HPA + metrics-server → 自动监控CPU/内存指标        │
│  cert-manager → TLS证书自动续期                     │
│  Network Policy → 只允许前端Pod访问后端Pod          │
└─────────────────────────────────────────────────────┘
```

请求链路：`用户 → APISIX(WAF/限流/路由) → 前端Pod(静态资源) / 后端Pod(/api)` ；后端再访问 MySQL（持久数据）、Redis（商品详情缓存、注册验证码）与 MinIO（管理后台上传的商品图片/视频，S3协议兼容的自建对象存储）。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React + Vite + React Router，Apple 风格 UI |
| 后端 | Spring Boot 3 + Spring Security（JWT）+ Spring Data JPA |
| 数据库 | MySQL 8（持久数据）+ Redis 7（缓存 / 验证码） |
| 对象存储 | MinIO（S3协议兼容，自建，存放商品图片/视频） |
| 邮件 | Spring Mail（注册邮箱验证码） |
| 集群 | K3s（轻量 Kubernetes） |
| 网关 | APISIX（路由 + WAF + 限流） |
| TLS | cert-manager 自动续期 |
| 伸缩 | HPA（CPU 阈值 50%） |
| 安全 | NetworkPolicy + Pod Security Standard（restricted）+ Secret |

---

## 仓库结构

```
k8s-mall/
├── frontend/          # React 前端
├── backend/           # Spring Boot 后端
├── k8s/               # 所有 k8s 部署清单
├── sql/init.sql       # 数据库初始化脚本
├── scripts/           # build.sh / deploy.sh / load-test.sh
└── README.md
```

---

## 部署到远程服务器

以下步骤假设远程服务器是一台全新的 Linux（Ubuntu 22.04 / Debian / CentOS Stream 均可），有公网 IP，且你能 SSH 登录并有 sudo 权限。

### 第一步：服务器基础环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y   # Debian/Ubuntu
# 或
sudo dnf update -y                        # CentOS/Rocky

# 安装 curl、git（多数系统已自带）
sudo apt install -y curl git             # 或 dnf install -y curl git
```

### 第二步：安装 Docker（用于构建镜像）

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $(whoami)
newgrp docker
docker version
```

### 第三步：安装 K3s（轻量 Kubernetes）

```bash
curl -sfL https://get.k3s.io | sh -

# 配置 kubectl（K3s 自带 kubectl，也可以软链到系统命令）
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

kubectl get nodes   # 确认节点 Ready
```

### 第四步：安装 metrics-server（HPA 依赖，K3s 通常已内置）

```bash
kubectl get deployment metrics-server -n kube-system
# 如果没有，手动安装：
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 第五步：安装 cert-manager（TLS 自动续期）

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
kubectl get pods -n cert-manager   # 等三个 Pod 都 Running
```

### 第六步：安装 APISIX + APISIX Ingress Controller（网关）

推荐用 Helm 安装：

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

helm repo add apisix https://charts.apiseven.com
helm repo update

kubectl create namespace apisix

helm install apisix apisix/apisix \
  --namespace apisix \
  --set ingress-controller.enabled=true \
  --set ingress-controller.config.apisix.serviceNamespace=apisix

kubectl get pods -n apisix   # 等待全部 Running
```

> APISIX 的 WAF（ModSecurity/Coraza 规则集）需要额外启用对应插件运行时，具体版本请参照 [APISIX 官方文档](https://apisix.apache.org/docs/apisix/plugins/) 中 `modsecurity` 插件章节操作，本仓库的 [k8s/gateway.yaml](k8s/gateway.yaml) 已假设该插件可用。

### 第七步：拉取代码到服务器

```bash
git clone <你的仓库地址> k8s-mall
cd k8s-mall
```

### 第八步：构建并推送镜像

如果服务器自建了私有镜像仓库（如 Harbor），或者用的是 K3s 自带的本地镜像导入方式：

```bash
# 方式一：推送到镜像仓库
export REGISTRY=your-registry.com/mall
export TAG=v1.0.0
export PUSH=true
./scripts/build.sh

# 方式二：单机 K3s，直接导入本地镜像，不走仓库
docker build -t mall/backend:latest ./backend
docker build -t mall/frontend:latest ./frontend
docker save mall/backend:latest mall/frontend:latest -o mall-images.tar
sudo k3s ctr images import mall-images.tar
```

> 如果用方式二，记得把 [k8s/backend-deploy.yaml](k8s/backend-deploy.yaml) 和 [k8s/frontend-deploy.yaml](k8s/frontend-deploy.yaml) 里的 `image` 字段改成 `mall/backend:latest` / `mall/frontend:latest`，并把 `imagePullPolicy` 设为 `IfNotPresent`。

### 第九步：准备 Secret（数据库密码 / JWT 密钥 / 邮箱 SMTP / MinIO 密钥）

**不要**把真实密钥提交到 git。在服务器上执行（先创建命名空间）：

```bash
kubectl apply -f k8s/namespace.yaml

kubectl create secret generic mysql-secret -n mall \
  --from-literal=MYSQL_ROOT_PASSWORD='设置一个强密码' \
  --from-literal=MYSQL_DATABASE='mall' \
  --from-literal=MYSQL_USER='mall' \
  --from-literal=MYSQL_PASSWORD='设置一个强密码'

# MinIO 自身的账号密码（即 root user/password，给 MinIO 容器自己用）
kubectl create secret generic minio-secret -n mall \
  --from-literal=MINIO_ROOT_USER='admin' \
  --from-literal=MINIO_ROOT_PASSWORD="$(openssl rand -base64 16)"

kubectl create secret generic backend-secret -n mall \
  --from-literal=DB_USERNAME='mall' \
  --from-literal=DB_PASSWORD='跟上面 MYSQL_PASSWORD 保持一致' \
  --from-literal=REDIS_PASSWORD='' \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=MAIL_HOST='smtp.qq.com' \
  --from-literal=MAIL_PORT='587' \
  --from-literal=MAIL_USERNAME='你的发信邮箱@qq.com' \
  --from-literal=MAIL_PASSWORD='邮箱后台申请到的SMTP授权码（不是登录密码）' \
  --from-literal=MINIO_ENDPOINT='http://minio:9000' \
  --from-literal=MINIO_ACCESS_KEY='跟上面 MINIO_ROOT_USER 保持一致' \
  --from-literal=MINIO_SECRET_KEY='跟上面 MINIO_ROOT_PASSWORD 保持一致' \
  --from-literal=MINIO_BUCKET='mall-media' \
  --from-literal=MINIO_PUBLIC_URL='https://media.你的域名.com'
```

邮箱 SMTP 授权码获取方式（任选一个邮箱服务商）：
- QQ 邮箱：登录网页版 → 设置 → 账户 → 开启「POP3/IMAP/SMTP服务」→ 生成授权码
- 163 邮箱：设置 → POP3/SMTP/IMAP → 开启服务 → 生成授权码
- Gmail：账号需开启两步验证后，在「应用专用密码」里生成

> `MINIO_PUBLIC_URL` 是后端拼接图片/视频访问地址用的前缀，需要能从公网/浏览器访问到。[k8s/gateway.yaml](k8s/gateway.yaml) 已内置 `media.example.com → minio:9000` 的只读路由（仅放行 GET/HEAD，上传/删除始终走后端接口，不直接暴露 MinIO 的写权限），[k8s/certificate.yaml](k8s/certificate.yaml) 也配好了对应的 TLS 证书——把这两处的 `media.example.com` 换成你自己的域名即可，记得同步把 DNS 也指过去。

### 第十步：执行部署

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

`deploy.sh` 会按顺序完成：创建命名空间 → 检测 Secret → 应用 ConfigMap → 部署 MySQL/Redis/MinIO 并等待就绪 → 执行 `sql/init.sql` 初始化表结构（内置默认管理员账号 `admin`/`admin123`）→ 部署后端/前端 → 应用 HPA 和 NetworkPolicy → 应用网关路由和证书（若对应组件未安装会跳过并提示）。

部署完成后访问 `https://你的域名/login`，用 `admin`/`admin123` 登录会自动跳转到后台管理页 `/admin`，可以在「商品管理」里新增商品并直接上传图片/视频——上传接口会把文件存进 MinIO，数据库只保存返回的 URL。

### 第十一步：域名与 DNS

把 `k8s/gateway.yaml`、`k8s/certificate.yaml` 里的 `mall.example.com`（主站）和 `media.example.com`（图片/视频访问域名）都替换成你的真实域名，重新 `kubectl apply`；同时在你的 DNS 服务商把这两个域名的 A 记录都指向服务器公网 IP。`backend-secret` 里的 `MINIO_PUBLIC_URL` 也要相应改成 `https://media.你的域名.com`。

### 第十二步：验证部署

```bash
kubectl get pods -n mall          # 所有 Pod 应为 Running
kubectl get hpa -n mall           # 查看 HPA 当前副本数/CPU使用率
kubectl get certificate -n mall   # 等待 READY=True（cert-manager 签发证书）

curl -I https://你的域名/          # 前端
curl -I https://你的域名/api/products
```

### 压测验证自动伸缩（可选）

```bash
TARGET_URL=https://你的域名/api/products ./scripts/load-test.sh
```

---

## 常见问题

**Q: 镜像拉取失败 / ImagePullBackOff？**
A: 检查 `image` 字段指向的仓库地址是否可达，私有仓库需要额外配置 `imagePullSecrets`。

**Q: HPA 显示 `<unknown>` 的 CPU 使用率？**
A: 通常是 metrics-server 没装好或还在采集冷启动期（等 1-2 分钟），用 `kubectl top pods -n mall` 验证指标是否正常。

**Q: 注册邮件收不到？**
A: 检查 `backend-secret` 里的 `MAIL_*` 是否填写正确，看后端日志 `kubectl logs -n mall deploy/backend`；多数邮箱服务商要求用「SMTP授权码」而不是邮箱登录密码。

**Q: gateway.yaml / certificate.yaml apply 报错 CRD 不存在？**
A: 说明 APISIX Ingress Controller 或 cert-manager 还没装好，回到第五、六步检查。

**Q: 后台上传图片/视频后，前端页面显示不出来？**
A: 大概率是 `MINIO_PUBLIC_URL` 配置的域名没有解析到 MinIO，或者没有配置反代路由。检查浏览器能否直接打开返回的图片 URL；如果打不开，去补一条网关路由把该域名转发到 `minio:9000`（见第九步的提示）。

**Q: 忘记管理员密码怎么办？**
A: 进 MySQL 用 BCrypt 重新生成一个密码哈希更新 `t_user` 表（后台暂未提供改密/找回密码功能）。
