# 项目工作记忆

## 当前定位

这是一个面向 Windows 本地部署、IntelliJ IDEA 演示和课程答辩的电商系统。当前实现为 Maven WebApp，不再使用 React + Spring Boot 作为主展示路径。

## 当前技术栈

- 前端：HTML + CSS + jQuery
- 后端：Maven WebApp + Jakarta Servlet + JDBC
- 数据库：MySQL，沿用 `sql/init.sql`
- 缓存：Redis，用于邮箱验证码、发送冷却和商品缓存
- 对象存储：MinIO，用于商品图片、视频等媒体
- 运行容器：Tomcat 10.1.x

## 本地服务约定

- MySQL：`localhost:3306`
- Redis：Docker 容器 `mall-redis`，端口 `6379`，无密码
- MinIO：`http://localhost:9000`，控制台 `http://localhost:9001`
- WebApp：`http://localhost:8080/mall-webapp/`

## 默认账号

- 管理员：`admin` / `admin123`
- MinIO：`minioadmin` / `minioadmin`
- MySQL 业务用户：`mall`

## 关键实现点

- 普通用户从 `t_user` 表登录，密码使用 BCrypt 校验。
- 管理员使用固定账号登录，登录后 Session 角色为 `ADMIN`。
- `/api/admin/*` 后台接口统一校验管理员权限。
- 普通用户注册依赖真实邮箱验证码。
- 验证码和发送冷却存储在 Redis。
- 商品详情支持图片和视频媒体展示。
- 首页广告点击后进入对应商品分类。
- 前端根据当前登录角色动态展示用户菜单或后台菜单。

## 部署注意事项

- MySQL 数据库和 SQL 导入必须使用 `utf8mb4`。
- IDEA 中运行配置应选择 Tomcat Server / Local，不要选择 TomEE。
- Deployment 使用 `mall-webapp:war exploded`，Application context 使用 `/mall-webapp`。
- 修改 Java/HTML/CSS/JS 后需要重新 Build 或重新部署 Tomcat。
- 邮箱验证码需要在 Tomcat 环境变量中配置 SMTP 参数。
