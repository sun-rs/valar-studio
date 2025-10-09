# Valar Studio 安全配置指南（2025）

> 本文总结了部署 Valar Studio 时需要关注的安全要点，覆盖环境配置、访问控制、日志审计与运维建议。

## 1. 环境准备

1. 复制环境变量模板：
   ```bash
   cp .env.example .env
   ```
2. 生成强随机密钥：
   ```bash
   openssl rand -base64 48
   ```
3. 在 `.env` 中至少修改以下字段：
   - `SECRET_KEY`：使用上一步生成的随机值。
   - `DEFAULT_ADMIN_PASSWORD`：长度 ≥ 16 的复杂密码。
   - `APP_ALLOWED_ORIGINS`：设置为真实前端域名（逗号分隔）。
   - `DATABASE_URL`：生产环境建议改为托管数据库（PostgreSQL/MySQL）。
   - `VALAR_MONGO_CONNECTION`：配置对应的 Valar Mongo 连接别名或 URI。

> ⚠️ 前后端均读取仓库根目录的 `.env`，不再使用 `backend/.env`。

## 2. 文件权限

```bash
chmod 600 .env
chmod 600 backend/data/valar.db   # 若迁移到外部数据库可忽略
```

确保部署用户拥有最小权限；生产环境建议将敏感配置托管到云端秘密管理服务（AWS Secrets Manager、阿里云 KMS 等）。

## 3. 身份认证与访问控制

- 登录采用 JWT（HS256）+ bcrypt 密码散列。
- 支持「记住登录」选项，默认 24 小时过期，可延长至 30 天。
- 登录限流策略：
  - 同用户 + IP 15 分钟失败 ≥ 5 次 → 封禁 30 分钟。
  - 同 IP 1 分钟失败 ≥ 10 次 → 封禁 48 小时。
- 管理员可通过 `/api/v1/security/*` API 查询登录与访问日志，必要时执行封禁清理。
- 推荐在反向代理（Nginx / Traefik）层启用：
  - HTTPS + HSTS。
  - 速率限制与 WAF 规则。
  - `auth_request` 钩子调用 `/api/v1/auth/verify-admin` 对敏感后台进行二次校验。

## 4. 网络与基础设施

- 仅开放必要端口：前端（80/443）、后端（容器内部 8000）、Mongo/数据库应限制在专用子网或安全组中。
- 若使用 docker-compose，建议：
  - 将后端服务放入专用网络，仅暴露给反向代理。
  - 使用 `restart: unless-stopped`，并在主机层设置资源限制。
- 日志输出采用标准输出，可接入 ELK、Datadog 或云监控平台；务必设置日志保留策略。

## 5. 安全部署核对清单

| 项目 | 状态 |
| --- | --- |
| 修改默认管理员密码、禁用多余账号 | ☐ |
| 更新 `SECRET_KEY`、数据库、Mongo 等敏感凭据 | ☐ |
| 配置正确的 `APP_ALLOWED_ORIGINS`（含生产域名） | ☐ |
| 确认 `.env`、数据库文件权限为 600 | ☐ |
| 生产环境将 `DEBUG` 设为 `False` | ☐ |
| 反向代理启用 HTTPS / HSTS / WAF | ☐ |
| 启用登录限流日志告警（接入监控） | ☐ |
| 定期备份 SQLite / PostgreSQL 数据库 | ☐ |
| 定期审查 `account_permissions`、清理多余授权 | ☐ |
| 编写安全演练流程（密码重置、密钥轮换、灾难恢复） | ☐ |

## 6. 常见问题

**Q: 忘记管理员密码怎么办？**  
在 `.env` 中临时调整 `DEFAULT_ADMIN_PASSWORD`，重启后用新密码登录，并立即恢复配置文件（或在数据库中直接更新密码哈希）。

**Q: 如何限制访问来源？**  
在反向代理层添加 IP 白名单或自定义认证逻辑；同时结合 `/api/v1/security/authorized-access` 监控实际访问来源。

**Q: 需要保存多久的访问日志？**  
默认全部保留。可使用 `/api/v1/security/cleanup-logs` 指定保留天数，或安排定时任务清理。

## 7. 变更记录

- **2025-10-09**：统一至 `docs/` 目录，更新 `.env` 共享方案、限流策略与部署清单。

如发现漏洞或需要安全支持，请在内部渠道报告，并附带复现步骤、日志与影响范围。
