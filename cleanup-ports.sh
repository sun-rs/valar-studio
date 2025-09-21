#!/bin/bash

# Script to manually cleanup ports for Valar Web System

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

echo "
╔══════════════════════════════════════════════════════════════════╗
║             端口清理工具 - Port Cleanup Tool                     ║
╚══════════════════════════════════════════════════════════════════╝
"

# Function to show processes on port
show_port_info() {
    local port=$1
    echo ""
    echo "端口 $port 的进程信息:"
    echo "----------------------------------------"
    lsof -i :$port 2>/dev/null || echo "端口 $port 未被占用"
    echo "----------------------------------------"
}

# Check port 8000 (Backend)
print_info "检查后端端口 8000..."
show_port_info 8000

if lsof -i :8000 -sTCP:LISTEN >/dev/null 2>&1; then
    read -p "是否强制释放端口 8000? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "释放端口 8000..."

        # Kill all processes on port 8000
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        sleep 1

        # Check if need sudo
        if lsof -i :8000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_info "使用 sudo 权限释放端口..."
            sudo lsof -ti:8000 | xargs sudo kill -9 2>/dev/null || true
        fi

        if lsof -i :8000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_error "无法释放端口 8000"
        else
            print_status "端口 8000 已释放"
        fi
    fi
else
    print_status "端口 8000 未被占用"
fi

# Check port 3000 (Frontend)
print_info "检查前端端口 3000..."
show_port_info 3000

if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
    read -p "是否强制释放端口 3000? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "释放端口 3000..."

        # Kill all processes on port 3000
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 1

        # Check if need sudo
        if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_info "使用 sudo 权限释放端口..."
            sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || true
        fi

        if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_error "无法释放端口 3000"
        else
            print_status "端口 3000 已释放"
        fi
    fi
else
    print_status "端口 3000 未被占用"
fi

# Kill Python uvicorn processes
print_info "检查 uvicorn 进程..."
if pgrep -f "uvicorn" > /dev/null; then
    read -p "发现 uvicorn 进程，是否终止? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -9 -f "uvicorn" 2>/dev/null || true
        print_status "uvicorn 进程已终止"
    fi
else
    print_status "没有运行中的 uvicorn 进程"
fi

# Kill node dev server processes
print_info "检查 Node 开发服务器进程..."
if pgrep -f "vite" > /dev/null; then
    read -p "发现 Vite 进程，是否终止? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -9 -f "vite" 2>/dev/null || true
        print_status "Vite 进程已终止"
    fi
else
    print_status "没有运行中的 Vite 进程"
fi

# Clean up PID files
if [ -f "backend.pid" ] || [ -f "frontend.pid" ]; then
    read -p "是否清理 PID 文件? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f backend.pid frontend.pid
        print_status "PID 文件已清理"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
print_status "端口清理完成！"
echo "现在可以运行 ./start.sh 启动服务"
echo "════════════════════════════════════════════════════════════════════"