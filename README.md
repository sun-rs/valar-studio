# Valar 量化交易 Web 管理系统

## 项目简介

Valar Web 管理系统是一个专业的量化交易管理平台，为 Valar 量化交易库提供可视化的 Web 界面。系统支持多账户管理、实时数据监控、权限控制等功能。

## 主要功能

- 📊 **仪表盘**: 实时展示账户统计、资金状况、收益率等关键指标
- 📈 **持仓管理**: 查看所有账户的持仓明细，支持汇总视图和独立账户视图
- 📝 **订单管理**: 查询历史订单和成交记录，支持日期筛选
- 👥 **用户管理**: 管理员可创建用户、分配权限、管理账户
- 🔐 **权限控制**: 基于角色的访问控制，用户只能查看授权账户
- 📱 **响应式设计**: 完美支持桌面和移动设备

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

- 前端界面: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

## 系统要求

- Python 3.8+
- Node.js 14+
- npm 6+
- Docker（可选）

## 环境配置

### 后端配置

创建 `backend/.env` 文件：

```env
# 数据库配置
DATABASE_URL=sqlite:///./valar.db

# 安全配置
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS配置
CORS_ORIGINS=["http://localhost:3000"]

# 应用配置
DEBUG=True
APP_NAME=Valar Web Management System
APP_VERSION=1.0.0
```

### 前端配置

创建 `frontend/.env` 文件：

```env
# API配置
VITE_API_URL=http://localhost:8000
```

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

## 常见问题

### Q: 端口被占用怎么办？
A: 脚本会自动检测并释放占用的端口，或手动修改配置文件中的端口号。

### Q: 如何修改默认管理员密码？
A: 登录后进入"设置"页面修改密码。

### Q: 如何添加新用户？
A: 管理员登录后，进入"系统管理"页面添加用户。

### Q: 数据库在哪里？
A: SQLite 数据库文件位于 `backend/valar.db`。

### Q: 如何配置账户权限？
A: 管理员在"系统管理"->"权限管理"中配置用户可访问的账户。

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。