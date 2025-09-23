#!/bin/bash

# Docker-based startup script for Valar Studio Management System

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Banner
echo "
╔══════════════════════════════════════════════╗
║     Valar Docker 启动脚本                    ║
║     Valar Docker Startup Script              ║
╚══════════════════════════════════════════════╝
"

# Check Docker installation
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装，请先安装 Docker"
    echo "访问 https://www.docker.com/get-started 下载安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    # Try docker compose (new syntax)
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

print_status "Docker 已安装"

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker 服务未运行，请启动 Docker 服务 (macOS: Docker Desktop, Linux: sudo systemctl start docker)"
    exit 1
fi

print_status "Docker 服务运行中"

# Build and start services
print_info "构建并启动服务..."
$COMPOSE_CMD up --build -d

# Wait for services to be healthy
print_info "等待服务启动..."
sleep 5

# Check service status
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    print_status "后端服务已启动"
else
    print_error "后端服务启动失败"
    echo "查看日志: docker logs valar-backend"
fi

if curl -s http://localhost:3001 > /dev/null 2>&1; then
    print_status "前端服务已启动"
else
    print_error "前端服务启动失败"
    echo "查看日志: docker logs valar-frontend"
fi

echo ""
echo "════════════════════════════════════════════════"
print_status "Docker 服务已启动！"
echo ""
echo "  前端地址: http://localhost:3001"
echo "  后端地址: http://localhost:8000"
echo "  API文档: http://localhost:8000/docs"
echo ""
echo "  默认管理员账号："
echo "    用户名: admin"
echo "    密码: admin123456"
echo ""
echo "  常用命令:"
echo "    查看日志: docker-compose logs -f"
echo "    停止服务: docker-compose down"
echo "    重启服务: docker-compose restart"
echo "════════════════════════════════════════════════"
