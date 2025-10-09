# Valar Studio 项目蓝图（2025 年整理）

> 本文为团队内部的高层设计摘要，便于快速回顾系统架构、核心功能与安全策略。若需更详细的技术材料，请参考 `docs/` 目录。

## 1. 产品定位

- **目标用户**：量化交易团队、风控人员、运营支持团队。
- **核心价值**：围绕 Valar 数据栈提供合规、实时的账户与交易监控平台。
- **设计原则**：
  1. **权限先行**：所有数据访问均按账户授权过滤。
  2. **可观测性**：支持手动/自动刷新，保留安全日志与审计线索。
  3. **可部署性**：统一 `.env` 配置，脚本与 Docker 均可一键部署。

## 2. 总体架构

```
React SPA (Vite)  ──REST/JWT──►  FastAPI 服务层  ──SQLAlchemy──►  SQLite 元数据
        ▲                                    │
        │                                    └─ Valar Service (async) ─► MongoDB/Valar
 RefreshControl ◄── Zustand ═══════════════════════════════════════════╝
```

### 核心组件

- **前端**：React 18 + TypeScript，Ant Design 主题定制，Zustand 管理认证/刷新状态，ECharts 负责金融可视化。
- **后端**：FastAPI + SQLAlchemy，JWT 认证，安全中间件输出访问日志，Valar 服务通过线程池访问 MongoDB。
- **数据层**：SQLite 持久化用户、账户配置、权限、安全日志；Valar/MongoDB 提供实时持仓与订单交易数据。

## 3. 功能模块总览

| 模块 | 说明 |
| --- | --- |
| 仪表盘 | 汇总总资产、净利润、保证金和可用资金，提供账户概览与历史曲线。 |
| 持仓管理 | 表格 / 热力图 / 图表三视角展示持仓，按用户权限过滤账户。 |
| 订单管理 | 支持多账户、按日期检索、特殊订单筛选以及成交明细展开。 |
| 账户配置 | 管理员维护交易账户清单、初始资金与标签。 |
| 权限矩阵 | 管理员为用户分配 `view / trade / manage` 权限。 |
| 安全审计 | 登录尝试、防爆破封禁、访问日志与统计接口。 |
| 用户设置 | 个人信息、密码、通知偏好等自助管理。 |

## 4. 关键业务流程

1. **登录认证**：`POST /api/v1/auth/login` → 校验凭据、记录安全日志 → 返回 JWT + 用户权限 → 前端存储并刷新 `authStore`。
2. **自动刷新**：各页面在 `useRefreshStore` 注册刷新函数 → `RefreshControl` 手动或定时触发 → 后端按权限过滤账户后调用 Valar 获取最新数据。
3. **权限更新**：管理员在权限矩阵修改授权 → `AccountPermission` 表写入 → 后续 API 调用实时生效。

## 5. 安全要点

- bcrypt 密码散列，HS256 JWT；生产环境必须更换 `SECRET_KEY` 与默认管理员密码。
- 登录限流：同用户+IP 15 分钟失败 ≥5 次封禁 30 分钟；同 IP 1 分钟失败 ≥10 次封禁 48 小时。
- `SecurityLogMiddleware` 记录未授权地址与敏感 API 访问；`/api/v1/security/*` 提供查询与清理接口。
- 建议部署在 HTTPS 与 WAF 之后，可结合 Nginx `auth_request` 调用 `/auth/verify-admin` 做二次校验。

## 6. 部署方式

- **脚本**：`./start.sh` 同时启用前后端服务。
- **Docker**：`./docker-start.sh` 或 `docker-compose up -d`。
- **配置要求**：修改 `.env` 中的 `SECRET_KEY`、`DEFAULT_ADMIN_PASSWORD`、`APP_ALLOWED_ORIGINS`、数据库及 Valar 连接；设置 `backend/data/valar.db` 与 `.env` 权限为 `600`。

## 7. 文档索引

- `docs/SYSTEM_OVERVIEW.md` —— 完整系统概述、运维建议与 Roadmap。
- `docs/SECURITY.md` —— 安全配置清单与最佳实践。
- `README.md` —— 快速启动命令、脚本说明与功能简介。

---

若新增模块或进行架构性调整，请同步更新本文及 `docs/` 目录，确保团队共享最新的设计基线。
