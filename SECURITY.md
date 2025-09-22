# 安全配置指南

本文档描述了 Valar Web 系统的安全配置要求和最佳实践。

## 快速安全检查

在部署前请确保完成以下安全配置：

### 1. 环境变量配置

```bash
# 1. 复制环境变量模板
cp backend/.env.example backend/.env

# 2. 生成安全的 SECRET_KEY
openssl rand -base64 32

# 3. 编辑 .env 文件，修改以下关键配置：
# - SECRET_KEY: 使用上一步生成的密钥
# - DEFAULT_ADMIN_PASSWORD: 设置强密码（16位以上，包含大小写字母、数字、特殊字符）
# - CORS_ORIGINS: 设置为实际的前端域名
```

### 2. 文件权限设置

```bash
# 设置数据库文件权限（仅所有者可读写）
chmod 600 backend/data/valar.db

# 设置环境变量文件权限
chmod 600 backend/.env
```

### 3. 生产环境配置

```env
# .env 文件中的生产环境配置
DEBUG=False
CORS_ORIGINS=["https://yourdomain.com"]
```

## 安全功能

### 认证与授权
- JWT Token 认证机制
- bcrypt 密码哈希加密
- 基于角色的访问控制（RBAC）
- 用户会话管理

### 数据保护
- 环境变量分离敏感配置
- SQLite 数据库文件权限控制
- API 参数验证和类型检查
- SQL 注入防护（SQLAlchemy ORM）

### 网络安全
- CORS 跨域请求控制
- API 路由权限验证
- HTTPS 支持（推荐）

## 安全检查清单

部署前请完成以下检查：

- [ ] 修改默认管理员密码
- [ ] 生成并配置强密码 SECRET_KEY
- [ ] 设置正确的 CORS 域名
- [ ] 设置数据库文件权限（600）
- [ ] 设置 .env 文件权限（600）
- [ ] 确认 DEBUG=False（生产环境）
- [ ] 启用 HTTPS（生产环境）
- [ ] 定期备份数据库文件
- [ ] 审计用户权限分配
- [ ] 监控系统访问日志

## 常见安全问题

### Q: 忘记管理员密码怎么办？
A: 可以直接修改 `.env` 文件中的 `DEFAULT_ADMIN_PASSWORD`，重启服务即可。

### Q: 如何生成安全的密钥？
A: 使用 `openssl rand -base64 32` 生成 32 字节的随机密钥。

### Q: 数据库文件在哪里？
A: 默认位于 `backend/data/valar.db`，请确保设置正确的文件权限。

### Q: 如何启用 HTTPS？
A: 推荐使用 Nginx 反向代理配置 SSL 证书，或使用 Let's Encrypt 免费证书。

## 安全联系

如发现安全漏洞，请通过以下方式报告：
- 创建 GitHub Issue（标记为 security）
- 或通过私人方式联系项目维护者

## 更新日志

- 2024-09-21: 初始版本，包含基础安全配置指南