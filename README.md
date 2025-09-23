# Valar 量化交易 Web 管理系统

## 项目简介

Valar Web 管理系统是一个专业的量化交易管理平台，为 Valar 量化交易库提供可视化的 Web 界面。系统支持多账户管理、实时数据监控、权限控制等功能。

## 主要功能

- 📊 **仪表盘**: 实时展示账户统计、资金状况、收益率等关键指标，包含账户历史资金曲线图（支持5天历史，非连续交易时间处理）
- 📈 **持仓管理**: 支持表格视图、热力图和饼图三种可视化模式，可按品种查看持仓分布，符合中国市场颜色逻辑（红涨绿跌）
- 📝 **订单管理**: 查询历史订单和成交记录，支持日期筛选和特殊订单过滤
- 👥 **用户管理**: 管理员可创建用户、分配权限、管理账户配置，支持用户备注功能
- 🔐 **权限控制**: 基于角色的访问控制，用户只能查看授权账户，完整的审计日志
- 📱 **响应式设计**: 完美支持桌面和移动设备
- 🌙 **夜盘支持**: 完整支持期货夜盘交易时间段（21:00-02:30）
- 🛡️ **安全保障**: JWT认证、密码加密、环境变量配置、API参数验证

## 技术栈

### 前端
- React 18 + TypeScript
- Ant Design Pro 5.0
- Zustand 状态管理
- Vite 构建工具

### 后端
- FastAPI
- SQLAlchemy + SQLite
- JWT 认证
- Valar Python Library

## 快速开始

### 方式一：一键启动脚本（推荐）

首次运行前请先复制环境配置模板：

```bash
cp .env.example .env
# 按需修改 .env 内的秘钥、域名、端口等配置
```

#### macOS/Linux:
```bash
# 添加执行权限
chmod +x start.sh stop.sh

# 启动服务
./start.sh

# 停止服务
./stop.sh
```

#### Windows:
```batch
# 启动服务
start.bat

# 停止服务
stop.bat
```

### 方式二：Docker 启动

```bash
# 添加执行权限（macOS/Linux）
chmod +x docker-start.sh

# 启动服务
./docker-start.sh

# 或使用 docker-compose 命令
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式三：手动启动

#### 启动后端：
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 启动前端：
```bash
cd frontend
npm install
npm run dev
```

## 访问地址

- 前端界面: http://localhost:3001
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 默认账号

- 用户名: `admin`
- 密码: `admin123456`

## 系统要求

- Python 3.8+
- Node.js 18+（开发环境使用 Vite，需支持原生 ESM/顶层 await）
- npm 8+
- Docker（可选）

> `./start.sh` 会自动校验 Node.js 版本，如低于要求会退出并提示升级命令。

## 环境配置

### 统一环境配置

> 从现在起，**前后端都读取仓库根目录的 `.env` 文件**，无需分别配置。启动脚本会自动加载该文件，FastAPI 使用同一份配置（`backend` 不再需要单独 `.env`）。

1. 复制模板并根据需要修改（务必更换密钥、管理员密码等敏感信息）：

```bash
cp .env.example .env
```

2. 常用配置说明（详见 `.env.example` 内注释）：

| 变量 | 作用 | 默认值 |
| ---- | ---- | ------ |
| `APP_NAME` / `APP_VERSION` | 应用信息 | `Valar Web` / `1.0.0` |
| `HOST` / `PORT` | 后端监听地址与端口 | `0.0.0.0` / `8000` |
| `SECRET_KEY` | JWT 加密密钥（**必须修改**） | 占位值 |
| `DEFAULT_ADMIN_*` | 初始管理员账号（**必须修改密码**） | `admin` / `change-me-now` |
| `APP_ALLOWED_ORIGINS` | 统一的前端域名列表（逗号分隔）。后端用于 CORS，前端用于 Vite `allowedHosts` | `http://localhost:3001,http://localhost:5173` |
| `VITE_PORT` / `VITE_HOST` | 前端开发服端口/监听地址（可选覆盖） | `3001` / `0.0.0.0` |
| `VITE_API_TARGET` | 前端代理到的后端地址 | `http://127.0.0.1:8000` |

3. 如需扩展其他环境变量，可直接在 `.env` 中新增，后端可通过 Pydantic Settings 自动读取同名变量。

## 功能说明

### 1. 仪表盘
- 展示总资产、净利润、总保证金、可用资金
- 账户明细表格，实时更新
- 5秒自动刷新（可配置）

### 2. 持仓管理
- 汇总视图：所有账户的持仓汇总
- 独立账户视图：各账户独立持仓
- 支持表格/图表切换显示
- 默认按保证金降序排列

### 3. 订单管理
- 委托单和成交单分开展示
- 支持日期查询
- 订单状态颜色标识
- Order-Trade 关联展示

### 4. 系统管理（管理员）
- 用户 CRUD 操作
- 权限矩阵配置
- 账户配置管理
- 审计日志查看

### 5. 个人设置
- 修改密码
- 个人信息管理
- 查看管理的账户

## 开发指南

### 目录结构

```
valar-web/
├── backend/                # 后端代码
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── core/          # 核心配置
│   │   ├── models/        # 数据模型
│   │   ├── schemas/       # Pydantic 模式
│   │   └── services/      # 业务逻辑
│   └── requirements.txt
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/        # 页面
│   │   ├── services/     # API 服务
│   │   └── stores/       # 状态管理
│   └── package.json
├── start.sh              # macOS/Linux 启动脚本
├── stop.sh               # macOS/Linux 停止脚本
├── start.bat             # Windows 启动脚本
├── stop.bat              # Windows 停止脚本
├── docker-compose.yml    # Docker 配置
└── README.md            # 项目说明

```

### API 接口

查看完整 API 文档: http://localhost:8000/docs

主要接口：
- `/api/auth/*` - 认证相关
- `/api/dashboard/*` - 仪表盘数据
- `/api/positions/*` - 持仓数据
- `/api/orders/*` - 订单数据
- `/api/admin/*` - 管理功能

## 安全配置

### 生产环境部署

1. **环境变量配置**
   ```bash
   # 生成安全的SECRET_KEY
   openssl rand -base64 32

   # 设置强密码
   # 建议使用包含大小写字母、数字、特殊字符的16位以上密码
   ```

2. **数据库文件权限**
   ```bash
   # 设置数据库文件权限（仅所有者可读写）
   chmod 600 backend/data/valar.db
   ```

3. **HTTPS配置**
   - 生产环境强烈建议启用HTTPS
   - 可使用Nginx反向代理配置SSL证书

### 安全检查清单

- [ ] 修改默认管理员密码
- [ ] 生成并配置强密码SECRET_KEY
- [ ] 设置正确的CORS域名
- [ ] 设置数据库文件权限（600）
- [ ] 启用HTTPS（生产环境）
- [ ] 定期备份数据库文件
- [ ] 审计用户权限分配
- [ ] 监控系统访问日志

### 登录安全与访问控制

#### 登录失败封禁策略

系统实现了双层安全封禁机制，以保护系统免受暴力破解攻击：

**第一层：用户+IP组合封禁**
- **触发条件**: 同一IP地址对同一用户名进行5次错误登录尝试（时间窗口：15分钟）
- **封禁时长**: 30分钟
- **影响范围**: 仅封禁该IP对该特定用户名的登录尝试，不影响其他用户

**第二层：IP地址全面封禁**
- **触发条件**: 同一IP地址在1分钟内产生10次或以上的登录失败记录（跨所有用户名）
- **封禁时长**: 48小时
- **影响范围**: 该IP地址将被完全禁止访问系统

**重要说明**:
- 所有封禁记录在服务重启时会自动清除，确保开发和维护过程中的灵活性
- 系统不会在前端界面显示任何封禁相关信息，遵循安全保密原则
- 管理员可通过查看安全日志监控异常访问行为

#### 安全日志分类

系统提供三种类型的安全日志，便于管理员进行安全监控：

1. **未授权访问日志** (默认显示)
   - 记录所有未登录用户的访问行为
   - 包含详细的IP地址和设备信息
   - 重点监控潜在的恶意访问

2. **授权用户访问日志**
   - 记录已登录用户对安全敏感操作的访问
   - 包含完整的IP地址和设备信息，用于检测异常设备访问

3. **登录记录**
   - 记录所有登录尝试（成功和失败）
   - 包含完整的IP地址和用户代理信息
   - 用于分析登录模式和异常行为

**日志保留策略**:
- 默认保留90天的安全日志
- 管理员可通过系统清理功能调整保留期限
- 过期的封禁记录会自动清理

## 常见问题

### Q: 端口被占用怎么办？
A: 脚本会自动检测并释放占用的端口，或手动修改配置文件中的端口号。

### Q: 如何修改默认管理员密码？
A: 登录后进入"设置"页面修改密码。

### Q: 如何添加新用户？
A: 管理员登录后，进入"设置"页面的"用户管理"部分添加用户。

### Q: 数据库在哪里？
A: SQLite 数据库文件位于 `backend/data/valar.db`。

### Q: 如何配置账户权限？
A: 管理员在"账户配置"页面中配置用户可访问的账户。

### Q: 忘记管理员密码怎么办？
A: 可以直接修改 `.env` 文件中的 `DEFAULT_ADMIN_PASSWORD`，重启服务即可。

## 高级功能

### Nginx认证代理集成

Valar Web 提供了认证API，可以与Nginx配合使用，对其他服务进行访问控制。

#### 使用场景
保护服务器上的管理工具（如Portainer、Semaphore、JupyterLab等），只允许通过Valar Web认证的admin用户访问。

#### 配置步骤

1. **Valar Web提供认证端点**
   ```
   GET /api/v1/auth/verify-admin
   ```
   此端点验证JWT Token并检查admin权限，返回200(通过)或403(拒绝)。

2. **Nginx配置示例**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # 认证检查配置
       location = /auth {
           internal;
           proxy_pass http://localhost:8000/api/v1/auth/verify-admin;
           proxy_pass_request_body off;
           proxy_set_header Content-Length "";
           proxy_set_header X-Original-URI $request_uri;
           proxy_set_header Authorization $http_authorization;
           proxy_set_header Cookie $http_cookie;
       }

       # Valar Web主服务
       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }

       location /api/ {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }

       # 受保护的服务示例
       location /portainer/ {
           auth_request /auth;
           proxy_pass http://localhost:9000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

           # WebSocket支持
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }

       location /semaphore/ {
           auth_request /auth;
           proxy_pass http://localhost:3001/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }

       location /jupyterlab/ {
           auth_request /auth;
           proxy_pass http://localhost:8888/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

           # WebSocket支持
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }

       # 认证失败处理
       error_page 401 = @error401;
       location @error401 {
           return 302 /;
       }
   }
   ```

3. **工作原理**
   - 用户访问受保护的服务（如 `/portainer/`）
   - Nginx触发 `auth_request` 调用Valar Web验证API
   - Valar Web验证JWT Token和admin权限
   - 验证通过则允许访问，失败则重定向到登录页

4. **安全特性**
   - ✅ 统一认证：复用Valar Web用户体系
   - ✅ 细粒度控制：仅admin用户可访问
   - ✅ 会话同步：登出后立即失去访问权限
   - ✅ 审计记录：所有访问尝试都被记录
   - ✅ 零侵入：被保护的服务无需修改

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。
