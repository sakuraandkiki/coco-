# 项目上下文备忘

## 项目当前定位

这是一个面向 **Windows 本地部署、IntelliJ IDEA 演示和课程答辩** 的电商系统。当前主线实现为：

- 前端：HTML + CSS + jQuery
- 后端：Maven WebApp + Jakarta Servlet + JDBC
- 数据库：MySQL
- 缓存：Redis
- 对象存储：MinIO
- 运行容器：Tomcat 10.1.x

当前项目不再以 React + Spring Boot 作为主展示路径。解释性文档统一写在 `README.md`，答辩稿写在 `docs/defense-draft.md`，工作记忆写在 `docs/work-memory.md`。

## 当前启动方式

推荐 IDEA 展示方式：

1. 打开 Docker Desktop。
2. 启动 Redis：`docker start mall-redis`，如果没有容器则执行 `docker run -d --name mall-redis -p 6379:6379 redis:7-alpine`。
3. 启动 Windows 原生 MySQL，监听 `localhost:3306`。
4. 启动 Windows 原生 MinIO：`C:\minio\minio.exe server C:\minio\data --address ":9000" --console-address ":9001"`。
5. 用 IDEA 打开项目根目录。
6. 配置 Tomcat Server / Local，Tomcat Home 指向 `G:\tomcat10\apache-tomcat-10.1.56`。
7. Deployment 添加 `mall-webapp:war exploded`，Application context 设置 `/mall-webapp`。
8. 配置数据库、Redis、邮箱环境变量。
9. 启动 Tomcat，访问 `http://localhost:8080/mall-webapp/`。

## 关键约束

- 后端默认连接 `localhost:3306`、`localhost:6379`。
- `sql/init.sql` 是数据库结构和初始数据来源，数据库架构不要随意改变。
- MySQL 初始化和手动导入都要使用 `utf8mb4`。
- `.env` 是本地私有配置，不提交。
- Redis 无密码时 `REDIS_PASSWORD` 留空。
- 邮箱验证码需要真实 SMTP 授权码，`MAIL_PASSWORD` 不是邮箱登录密码。
- 修改代码后需要重新 Build 或重新部署 Tomcat。

## 默认账号

- 管理员：`admin` / `admin123`
- MinIO：`minioadmin` / `minioadmin`

## 当前功能覆盖

- 用户端：首页、列表、详情、购物车、结算、订单、登录、邮箱验证码注册。
- 管理端：商品分类、商品、商品子信息 1、商品子信息 2、SKU、广告栏、广告类别、订单、用户信息。
