# XX 电子商务系统

这是一个面向 Windows 本地部署、IntelliJ IDEA 演示和课程答辩的电商系统。项目已从原有实现全量重写为 **Maven WebApp + Servlet + JDBC + jQuery + 纯 HTML** 方案，保留原数据库结构，继续使用 `sql/init.sql` 初始化业务表和演示数据。

## 1. 项目介绍

### 1.1 项目目标

本项目实现一个完整的 B2C 电商系统，支持普通用户浏览商品、注册登录、加入购物车、结算下单、查看订单；支持管理员进入后台维护商品、分类、广告、订单和用户数据。

项目重点是本地可运行、可展示、可讲解：

- 使用传统 WebApp 方式部署到 Tomcat，符合课程中 Servlet/WebApp 的展示要求。
- 使用 MySQL 保存核心业务数据，数据库表结构沿用 `sql/init.sql`。
- 使用 Redis 保存邮箱验证码、验证码发送冷却和商品查询缓存。
- 使用 MinIO 作为对象存储服务，可用于商品图片、视频等媒体文件。
- 前端使用 HTML、CSS、jQuery 实现单页交互，普通用户和管理员登录后看到不同页面。

### 1.2 当前技术栈

| 层级 | 技术 |
|---|---|
| 前端 | HTML + CSS + jQuery |
| 后端 | Maven WebApp + Jakarta Servlet |
| 数据访问 | JDBC + MySQL Connector/J |
| JSON 序列化 | Gson |
| 登录状态 | HttpSession |
| 密码处理 | BCrypt |
| 邮箱验证码 | Jakarta Mail + SMTP |
| 缓存 | Redis 7 |
| 对象存储 | MinIO |
| 数据库 | MySQL 8/9 |
| 运行容器 | Tomcat 10+ |
| 开发工具 | IntelliJ IDEA |

### 1.3 目录结构

```text
coco-/
├── backend/
│   ├── pom.xml                         # Maven WebApp，打包为 WAR
│   └── src/main/
│       ├── java/com/mall/web/
│       │   ├── filter/EncodingFilter.java
│       │   ├── servlet/MallServlet.java
│       │   └── util/
│       │       ├── Db.java
│       │       ├── MailClient.java
│       │       ├── RedisClient.java
│       │       └── Web.java
│       ├── resources/db.properties      # 默认配置，可被环境变量覆盖
│       └── webapp/
│           ├── index.html               # 前端单页入口
│           ├── assets/css/app.css
│           ├── assets/js/app.js
│           └── WEB-INF/web.xml
├── docs/
│   ├── defense-draft.md                 # 答辩草稿
│   └── work-memory.md                   # 项目工作记忆
├── sql/init.sql                         # 数据库建表和初始数据
├── AGENTS.md                            # Codex/项目上下文备忘
└── README.md
```

## 2. 功能模块

### 2.1 普通用户端

普通用户通过邮箱验证码注册，注册后使用用户名和密码登录。用户登录后看到用户端页面。

- 首页：广告展示、推荐分类、推荐商品。
- 商品列表：按分类、关键词查看商品。
- 商品详情：查看商品基础信息、媒体、子信息、规格参数和 SKU。
- 购物车：添加商品、修改数量、删除商品。
- 结算下单：从购物车生成订单。
- 订单中心：查看订单列表、订单详情、模拟支付、取消订单。
- 账号功能：邮箱验证码注册、登录、退出登录。

### 2.2 管理员端

管理员使用固定账号登录。管理员登录后进入后台页面，不展示普通用户购物页面。

默认管理员：

| 用户名 | 密码 |
|---|---|
| `admin` | `admin123` |

后台功能：

- 商品分类管理：新增、编辑、禁用分类；支持按名称、父级 ID、状态筛选。
- 商品管理：新增、编辑、下架商品；支持按名称、ID、库存、价格、状态筛选。
- 商品资料管理：维护商品子信息 1、商品子信息 2、SKU。
- 商品媒体管理：维护商品图片和视频，前端详情页支持视频播放。
- 广告管理：新增、编辑、禁用广告；支持按标题、广告分类、状态筛选。
- 广告类别管理：维护广告所属类别。
- 订单管理：查看订单，修改订单状态。
- 用户管理：查看用户，启用/禁用用户；支持按角色、用户名、ID 筛选。

### 2.3 登录与权限设计

- 未登录用户：只能访问首页、商品列表、商品详情、登录/注册。
- 普通用户：可以访问购物车、结算、订单等用户功能。
- 管理员：可以访问 `/api/admin/*` 后台接口和后台页面。
- 后端通过 `HttpSession` 保存登录状态，通过角色判断是否允许访问后台接口。

## 3. 数据库设计

数据库结构不改变，沿用 `sql/init.sql`。核心表如下：

| 表名 | 说明 |
|---|---|
| `t_user` | 用户信息，区分普通用户和管理员角色 |
| `t_product_category` | 商品分类 |
| `t_product` | 商品主表 |
| `t_product_info1` | 商品子信息 1 |
| `t_product_info2` | 商品子信息 2 |
| `t_product_sku` | 商品 SKU 信息 |
| `t_product_media` | 商品媒体，支持图片和视频 |
| `t_cart_item` | 购物车明细 |
| `t_order` | 订单主表 |
| `t_order_item` | 订单明细 |
| `t_ad_category` | 广告分类 |
| `t_advertisement` | 广告信息 |

注意：MySQL 初始化和手动导入必须使用 `utf8mb4`，否则中文数据可能在写入时就变成乱码。

## 4. 本地部署总览

推荐部署方式：

```text
Windows
├── Docker Desktop
│   └── Redis 容器：localhost:6379
├── MySQL 原生安装：localhost:3306
├── MinIO 原生 exe：localhost:9000 / 9001
└── Tomcat 10.1.x + IDEA：部署 mall-webapp
```

## 5. 一步一步部署

### 5.1 安装 Docker Desktop

1. 下载并安装 Docker Desktop：<https://www.docker.com/products/docker-desktop/>
2. 安装完成后启动 Docker Desktop。
3. 在 PowerShell 验证：

```powershell
docker version
```

能看到 Client 和 Server 信息说明 Docker Desktop 正常。

### 5.2 部署 Redis

如果本机没有 Redis 容器，执行：

```powershell
docker run -d --name mall-redis -p 6379:6379 redis:7-alpine
```

如果容器已经存在，执行：

```powershell
docker start mall-redis
```

验证 Redis：

```powershell
docker exec -it mall-redis redis-cli ping
```

返回：

```text
PONG
```

当前 Redis 不设置密码，后端配置为：

```text
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 5.3 安装和配置 MySQL

1. 下载 MySQL Community Server：<https://dev.mysql.com/downloads/mysql/>
2. 安装时选择 Server 类型，端口建议使用 `3306`。
3. 设置 root 密码，并记住该密码。
4. 如果命令行不能直接使用 `mysql`，使用完整路径执行，例如：

```powershell
& "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -uroot -p -P3306
```

进入 MySQL 后创建数据库和用户：

```sql
CREATE DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mall'@'localhost' IDENTIFIED BY '<你的MySQL密码>';
CREATE USER 'mall'@'%' IDENTIFIED BY '<你的MySQL密码>';
GRANT ALL PRIVILEGES ON mall.* TO 'mall'@'localhost';
GRANT ALL PRIVILEGES ON mall.* TO 'mall'@'%';
FLUSH PRIVILEGES;
EXIT;
```

回到项目根目录导入初始化 SQL：

```powershell
cd "C:\Users\Administrator\Desktop\新建文件夹 (4)"
cmd /c """C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"" --default-character-set=utf8mb4 -uroot -p -P3306 mall < sql\init.sql"
```

验证表是否导入成功：

```powershell
& "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" --default-character-set=utf8mb4 -uroot -p -P3306 mall
```

进入 MySQL 后执行：

```sql
SHOW TABLES;
SELECT username, role FROM t_user;
SELECT name FROM t_product_category LIMIT 5;
```

如果已经导入过，再次导入出现 `Duplicate entry`，说明数据已存在。需要重置时执行：

```sql
DROP DATABASE mall;
CREATE DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON mall.* TO 'mall'@'localhost';
GRANT ALL PRIVILEGES ON mall.* TO 'mall'@'%';
FLUSH PRIVILEGES;
```

然后重新导入 `sql/init.sql`。

### 5.4 部署 MinIO

1. 创建目录：

```powershell
mkdir C:\minio\data
```

2. 下载 Windows 版 MinIO Server：<https://min.io/download>
3. 将下载到的 exe 放到 `C:\minio\minio.exe`。如果文件名类似 `minio.windows-amd64.RELEASE.xxx.exe`，可以改名为 `minio.exe`。
4. 启动 MinIO：

```powershell
$env:MINIO_ROOT_USER="minioadmin"
$env:MINIO_ROOT_PASSWORD="minioadmin"
& "C:\minio\minio.exe" server "C:\minio\data" --address ":9000" --console-address ":9001"
```

5. 浏览器打开 MinIO 控制台：

```text
http://127.0.0.1:9001
```

登录账号：

```text
minioadmin / minioadmin
```

6. 创建 Bucket：

```text
mall-media
```

7. 下载 MinIO Client `mc.exe` 并放到 `C:\minio\mc.exe`，然后设置公开下载权限：

```powershell
& "C:\minio\mc.exe" alias set local http://127.0.0.1:9000 minioadmin minioadmin
& "C:\minio\mc.exe" anonymous set download local/mall-media
& "C:\minio\mc.exe" anonymous get local/mall-media
```

### 5.5 配置邮箱验证码

普通用户注册需要真实邮箱验证码。以 QQ 邮箱为例，在 IDEA Tomcat 环境变量中加入：

```text
MAIL_HOST=smtp.qq.com;MAIL_PORT=587;MAIL_USERNAME=你的QQ邮箱@qq.com;MAIL_PASSWORD=QQ邮箱SMTP授权码;MAIL_FROM=你的QQ邮箱@qq.com;MAIL_STARTTLS=true;MAIL_SSL=false
```

说明：

- `MAIL_USERNAME` 是完整邮箱地址。
- `MAIL_PASSWORD` 不是 QQ 登录密码，而是邮箱后台生成的 SMTP 授权码。
- 如果使用 465 SSL 端口，则改为：

```text
MAIL_HOST=smtp.qq.com;MAIL_PORT=465;MAIL_USERNAME=你的QQ邮箱@qq.com;MAIL_PASSWORD=QQ邮箱SMTP授权码;MAIL_FROM=你的QQ邮箱@qq.com;MAIL_STARTTLS=false;MAIL_SSL=true
```

### 5.6 部署网站到 Tomcat

1. 安装 JDK 17。
2. 安装 Tomcat 10.1.x，例如：

```text
G:\tomcat10\apache-tomcat-10.1.56
```

3. 用 IntelliJ IDEA 打开项目根目录：

```text
C:\Users\Administrator\Desktop\新建文件夹 (4)
```

4. 在 IDEA 中确认 Maven 已导入 `backend/pom.xml`。
5. 点击右上角运行配置，创建 **Tomcat Server / Local** 配置。
6. Server 页面选择 Tomcat Home：

```text
G:\tomcat10\apache-tomcat-10.1.56
```

7. Deployment 页面添加：

```text
mall-webapp:war exploded
```

8. Application context 设置为：

```text
/mall-webapp
```

9. Startup/Connection 或 Environment variables 中加入：

```text
DB_URL=jdbc:mysql://localhost:3306/mall?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true;DB_USERNAME=mall;DB_PASSWORD=<你的MySQL密码>;REDIS_HOST=localhost;REDIS_PORT=6379;REDIS_PASSWORD=;MAIL_HOST=smtp.qq.com;MAIL_PORT=587;MAIL_USERNAME=你的QQ邮箱@qq.com;MAIL_PASSWORD=QQ邮箱SMTP授权码;MAIL_FROM=你的QQ邮箱@qq.com;MAIL_STARTTLS=true;MAIL_SSL=false
```

10. 启动 Tomcat。
11. 浏览器访问：

```text
http://localhost:8080/mall-webapp/
```

### 5.7 修改代码后如何重新部署

如果改了 Java 代码、HTML、CSS、JS：

1. 停止 Tomcat。
2. IDEA 重新 Build Project，或重新运行 Tomcat 配置。
3. 确认 Deployment 是 `mall-webapp:war exploded`。
4. 启动 Tomcat。
5. 浏览器强制刷新：`Ctrl + F5`。

如果使用本机 Maven 命令打包：

```powershell
cd backend
mvn clean package
```

生成：

```text
backend\target\mall-webapp.war
```

再将 WAR 部署到 Tomcat 的 `webapps` 目录。

## 6. 常用检查命令

### 6.1 检查 MySQL

```powershell
& "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" --default-character-set=utf8mb4 -umall -p -P3306 mall
```

### 6.2 检查 Redis

```powershell
docker ps
docker exec -it mall-redis redis-cli ping
```

### 6.3 检查 MinIO

```text
http://127.0.0.1:9001
```

### 6.4 检查网站

```text
http://localhost:8080/mall-webapp/
```

## 7. 常见问题

### 7.1 `mysql` 命令无法识别

说明 MySQL 的 `bin` 目录没有加入 PATH。使用完整路径：

```powershell
& "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -uroot -p -P3306
```

### 7.2 SQL 导入出现重复数据

如果报错：

```text
Duplicate entry
```

说明数据库里已经有旧数据。可以删除数据库后重建，再重新导入。

### 7.3 中文乱码

必须保证：

- `sql/init.sql` 使用 UTF-8 编码。
- 创建数据库时使用 `utf8mb4`。
- 导入 SQL 时带 `--default-character-set=utf8mb4`。
- 页面 `<meta charset="UTF-8">` 存在。
- Tomcat 响应头为 `charset=UTF-8`。

### 7.4 邮箱验证码发送失败

检查：

- `MAIL_USERNAME` 是否为完整邮箱地址。
- `MAIL_PASSWORD` 是否为 SMTP 授权码。
- QQ 邮箱是否开启 SMTP 服务。
- `MAIL_PORT`、`MAIL_STARTTLS`、`MAIL_SSL` 是否匹配。
- Redis 是否启动，因为验证码存储依赖 Redis。

### 7.5 Tomcat 报不是 TomEE Home

本项目使用普通 Tomcat，不需要 TomEE。IDEA 运行配置应选择 **Tomcat Server / Local**，不要选择 TomEE。

## 8. 项目答辩入口

答辩草稿见：

```text
docs/defense-draft.md
```

项目工作记忆见：

```text
docs/work-memory.md
```
