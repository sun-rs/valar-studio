# Valar Studio — 系统综述与开发指南

> **说明**：本文件为整个项目的详细技术文档。使用中文编写，便于团队内部沟通和迭代。

---

## 1. 产品定位与设计原则

- **目标用户**：已经接入 Valar 量化数据栈（MongoDB + `valar` Python 库）的量化交易团队。
- **主要目标**：提供一个集 **实时监控、订单管理、权限管控、安全审计** 于一体的控制中心，覆盖多账户协同管理场景。
- **设计原则**：
  1. **近实时可观测性**：支持自动刷新与手动刷新，保障数据时效性。
  2. **权限精细化**：所有数据请求都基于账户授权过滤，确保安全合规。
  3. **易部署易运维**：默认提供脚本 + docker-compose，一套 `.env` 即可跑通前后端。

---

## 2. 仓库结构概览

| 路径 | 说明 |
| --- | --- |
| `frontend/` | React 18 + TypeScript 单页应用，使用 Vite 构建与 Ant Design 组件库，包含页面、公共组件、Zustand 状态与 API 封装。 |
| `backend/` | FastAPI 服务，使用 SQLAlchemy 操作 SQLite，并通过 Valar 库访问 MongoDB 数据。包含 API 路由、配置、模型、服务及中间件。 |
| `docker-compose.yml` / `docker-start.sh` | 官方容器部署方案。 |
| `start.sh` / `stop.sh` | 本地一键启动/停止脚本，自动加载根目录 `.env`。 |
| `.env.example` | 环境变量模板，前后端统一读取。 |
| `docs/` | 项目级文档目录（本文件位于此处）。 |

---

## 3. 运行时架构

```
┌───────────┐    HTTPS / JWT    ┌──────────────┐   SQLAlchemy    ┌─────────────┐
│ React SPA │ ───────────────► │ FastAPI 应用 │ ───────────────► │ SQLite 数据库 │
│  (浏览器) │ ◄─ REST JSON ──── │   权限校验   │                  │ 账户与权限表 │
└───────────┘                  │   订单/持仓   │                  └─────────────┘
        ▲                      │ 安全日志中间件│
        │                      └──────┬───────┘
        │                             │ 异步线程池
        │                             ▼
        │                        ┌──────────┐
        │                        │ valar_api│
        │                        │ 数据适配 │
        │                        └────┬─────┘
        │                             │
        ▼                             ▼
  自动/手动刷新               ┌────────────────┐
  Zustand 共用状态            │ MongoDB(Valar) │
                              └────────────────┘
```

1. 前端通过 Axios 请求 REST API 并在请求头携带 JWT；刷新逻辑由 `useRefreshStore` 统一管理。
2. 后端每次请求都会校验 JWT、查询 SQLite 中的用户与权限信息，再调用 Valar 服务访问 MongoDB 实时数据。
3. 安全中间件记录未授权访问和敏感操作访问，输出到 `access_logs` 表，为后续审计提供数据。

---

## 4. 后端（FastAPI）详解

### 4.1 入口与生命周期
- `backend/app/main.py` 定义 FastAPI 应用，挂载 CORS、`SecurityLogMiddleware`，注册所有 v1 API 路由。
- 应用启动时会：
  - 自动创建/校验所有 SQL 表。
  - 创建默认管理员账号（凭据来源于配置）。
  - 清理旧的登录封禁记录，避免部署后管理员被误锁定。

### 4.2 配置系统
- 使用 `pydantic-settings` (`core/config.py`) 读取根目录 `.env`。
- 关键字段说明：
  - `DATABASE_URL`: 默认 `sqlite:///./data/valar.db`，启动时会转成绝对路径并自动创建目录。
  - `SECRET_KEY`/`ALGORITHM`/`ACCESS_TOKEN_EXPIRE_MINUTES`: JWT 参数，生产环境必须修改。
  - `APP_ALLOWED_ORIGINS`: 前端跨域白名单，支持逗号分隔。
  - `DEFAULT_ADMIN_USERNAME`/`DEFAULT_ADMIN_PASSWORD`: 默认管理员账号密码，首次部署后务必修改。
  - `VALAR_MONGO_CONNECTION`: Valar 库使用的 Mongo 连接配置名称。

### 4.3 数据持久化
- **SQLite (SQLAlchemy ORM)**：
  - `users`、`account_config`、`account_permissions` 等业务表。
  - `login_attempts`、`access_logs`、`login_blocks` 等安全日志表。
  - `audit_log` 预留审计记录表。
- **MongoDB (Valar)**：通过 `services/valar_api.py` 调用 Valar 官方库，获取实时持仓、订单、成交等数据。

### 4.4 核心模型简介

| 模型 | 功能 |
| --- | --- |
| `User` | 用户信息，包含角色枚举（`admin`/`user`）、bcrypt 密码散列、激活状态等。 |
| `AccountConfig` | 交易账户配置，记录账户名称、初始资金、标签、经纪商等。 |
| `AccountPermission` | 用户与账户之间的授权关系，支持 `view/trade/manage` 权限类型。 |
| `LoginAttempt` / `AccessLog` / `LoginBlock` | 登录尝试、访问日志与封禁记录，用于防爆破与安全审计。 |
| `AuditLog` | 通用审计表，记录重要操作的前后状态。 |

### 4.5 服务与工具
- `valar_service.py`：异步封装 Valar API，使用 `asyncio.to_thread` 将阻塞操作转入线程池，统一输出 JSON 结构。
- `security_service.py`：封装登录限流策略、封禁逻辑以及日志查询统计。
- `core/security.py`：JWT 颁发与校验、bcrypt 密码校验，以及一个 Fernet 加解密工具（可扩展存储敏感字段）。
- `middleware/security_log.py`：按未授权/已授权敏感访问进行分类记录，捕获真实 IP 与 UA。

### 4.6 API 列表（默认前缀 `/api/v1`）

| 模块 | 主要路径 | 权限要求 | 说明 |
| --- | --- | --- | --- |
| `auth.py` | `POST /auth/login`、`POST /auth/logout`、`GET /auth/current`、`GET /auth/verify-admin` | `login` 无需登录，其余需认证 | 支持记住登录（30 天），记录登录审计，提供 Nginx 集成的 Admin 校验接口。 |
| `dashboard.py` | `GET /dashboard/summary`、`/accounts`、`/history` | 登录用户 | 汇总总资产、利润、保证金等指标，调用 Valar 获取历史流水。 |
| `positions.py` | `GET /positions`、`/summary` | 登录用户 | 按权限过滤账户，再向 Valar 获取持仓数据。 |
| `orders.py` | `GET /orders`、`/trades`、`/special`、`/current-date` | 登录用户 | 支持多个账户、特殊订单过滤及成交明细。 |
| `account_config.py` | `/accounts` CRUD、`/permissions` 管理 | **管理员** | 管理账户清单及授权矩阵。 |
| `settings.py` | `/settings/profile`、`/settings/password` 等 | 登录用户 | 个人资料与密码修改。 |
| `security.py` | `/security/login-attempts`、`/access-logs`、`/stats`、`/cleanup-logs` | **管理员** | 安全日志检索与清理。 |

所有受保护接口均依赖 `get_current_user` / `get_current_admin`，自动校验 JWT 与用户状态，并根据角色控制访问。

### 4.7 安全与观测
- 账号密码使用 bcrypt 加密，JWT 采用 HS256 签名。建议在生产中轮换密钥并启用 HTTPS。
- 登录限流策略：同用户+IP 15 分钟内失败 5 次则封禁 30 分钟；同 IP 1 分钟内失败 10 次则封禁 48 小时。
- 中间件对未授权访问、敏感 API 访问进行日志记录，便于复盘。
- 启动脚本会自动清除旧的封禁记录，避免误伤。
- 日志输出通过标准 logging，可对接集中式日志或 APM。

---

## 5. 前端（React + Vite）详解

### 5.1 启动与路由
- `src/main.tsx` 挂载 `<App />`；`App.tsx` 使用 Ant Design `ConfigProvider` 定制主题，并配置 React Router。
- `ProtectedRoute` 控制登录态，未登录跳转 `/login`；`AdminRoute` 限制管理员页面。
- 主布局 `MainLayout` 下的核心路由：
  - `/dashboard` 仪表盘
  - `/positions` 持仓管理（表格/热力图/图表）
  - `/orders` 订单与成交
  - `/modules`、`/account-config` 管理员功能
  - `/settings` 用户设置

### 5.2 状态管理
- 使用 **Zustand**：
  - `authStore`：负责登录、退出、初始化状态（`authService` 会读写 `localStorage`）。
  - `refreshStore`：记录当前页面回调与刷新间隔，`RefreshControl` 统一调度。
  - 其他业务状态可在各自目录下扩展。

### 5.3 服务封装
- `services/api.ts` 统一创建 Axios 实例：
  - `baseURL` 来自 `VITE_API_URL`（默认 `/api/v1`）。
  - 请求拦截器自动注入 `Authorization` 头。
  - 响应拦截器统一处理错误，并在 401 时清除本地状态、跳转登录页。
- 其他服务（如 `ordersService`、`dashboardService` 等）仅关注业务数据结构。

### 5.4 布局与共享组件
- `MainLayout`：包含侧边菜单、响应式 Drawer、头部用户信息和刷新控件。
- `RefreshControl`：调度刷新按钮、自动刷新开关与刷新间隔选择器。
- `AccountSelector`：复用的账户筛选卡片，支持全选和多选（与后端权限联动）。
- 全局样式集中在 `App.css`/`index.css`，定义玻璃拟态效果、色板与阴影。

### 5.5 核心页面概述
- **Login**：支持记住登录，自动提示错误。
- **Dashboard**：展示关键指标统计、账户列表与 ECharts 历史曲线。
- **Positions**：提供三种视图切换，兼顾密集表格与可视化展示。
- **Orders**：按日期、账户检索订单与成交，支持展开成交明细，提供“全部/特殊订单”切换。
- **Settings**：个人资料管理、密码修改、通知偏好等。
- **AccountConfig / Modules**：管理员维护账户信息与权限矩阵，控制模块开关。

### 5.6 响应式与视觉
- 每个页面有独立的 `index.css` 微调组件样式（如紧凑表格、渐变背景）。
- 媒体查询确保在移动端自动换行、元素堆叠、输入框宽度自适应。
- 主题 Token 统一颜色与圆角，保证视觉一致性。

---

## 6. 典型业务流程

### 6.1 登录流程
1. `authService.login` 调用 `POST /api/v1/auth/login`，提交用户名、密码、记住登录选项。
2. 后端校验凭据、记录登录尝试，生成 JWT（默认 24 小时，记住登录则 30 天）。
3. 前端保存 `access_token` / `user` 至 `localStorage`，更新 `authStore`，跳转至 `/dashboard`。

### 6.2 持仓自动刷新
1. 持仓页在 `useEffect` 中向 `refreshStore` 注册 `fetchData` 回调。
2. `RefreshControl` 根据用户操作或定时器触发 `triggerRefresh`。
3. `triggerRefresh` 调用当前页面回调，触发 `GET /api/v1/positions?accounts=...`。
4. 后端基于权限过滤账户，再从 Valar 获取实时数据并返回。
5. 前端根据选定视图展示，并缓存成交数据以支持行展开。

### 6.3 权限分配（管理员）
1. 管理员进入账户配置页，请求 `/account-config/accounts` 与 `/account-config/permissions`。
2. 修改后提交至 `PUT /api/v1/account-config/permissions`，批量更新用户与账户映射。
3. 后端写入 `AccountPermission`，后续所有数据请求都会实时读取最新权限。

---

## 7. 部署与运维

### 7.1 本地开发
```bash
# 首次安装依赖
cp .env.example .env
./start.sh           # 默认并行启动前后端

# 或手动运行
python -m venv backend/venv
source backend/venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --port 8000

cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3001
```

- 注意：默认管理员密码为 `admin123456`，请及时修改。
- `.env` 同时服务于前后端，避免配置分散。

### 7.2 Docker / 生产部署
- 运行 `./docker-start.sh` 或 `docker-compose up -d` 即可。
- 建议生产环境：
  - 将 `DATABASE_URL` 换成 PostgreSQL/MySQL 等生产级数据库，并引入迁移工具（建议后续接入 Alembic）。
  - 将 `VALAR_MONGO_CONNECTION` 指向安全托管的 Mongo 连接配置。
  - 在反向代理层开启 HTTPS、HSTS、防火墙/安全组策略。

### 7.3 日志与监控
- FastAPI 日志输出到标准输出，可接入 ELK、Datadog 等平台。
- 安全 API (`/security/*`) 可用于构建失败登录告警面板。
- Vite 构建报告会提示大体积 chunk，必要时利用代码分包减小主包体积。

---

## 8. 安全要点与加固建议
- **密钥管理**：部署前务必替换 `SECRET_KEY`、管理员密码、数据库/Mongo 凭据。
- **传输安全**：使用 HTTPS，推荐在反向代理层统一处理 TLS。
- **会话存储**：当前使用 `localStorage`。若需更强安全性，可改为 HttpOnly Cookie 并调整请求拦截器。
- **限流与审计**：登录限流已内置；可在 Nginx/Cloudflare 增设 API 级限流。充分利用 `AccessLog`、`LoginAttempt` 数据做安全审计。
- **依赖升级**：定期关注 FastAPI、Ant Design、Valar 等依赖的安全公告。

---

## 9. 后续规划（Roadmap）
- 引入 **Alembic** 作为数据库迁移方案，方便升级至 PostgreSQL 等生产数据库。
- 完善 **自动化测试**：后端补充 pytest，前端引入 Vitest + React Testing Library。
- 探索 **实时推送**：在高频场景下改用 WebSocket / SSE 以减少轮询。
- 扩展 **权限粒度**：细化 `permission_type`（读/下单/管理）并在 API 层严格控制。
- 提升 **可观测性**：输出结构化日志，接入 Prometheus/Grafana 监控请求延迟与错误率。

---

本指南用于补充根目录 `README.md` 的快速启动说明，涵盖系统架构、安全策略与代码组织。后续如新增模块或重大改动，请同步更新本文档，确保团队成员理解系统全貌。
