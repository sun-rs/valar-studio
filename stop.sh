#!/bin/bash

# Valar Web Management System - Stop Script
# This script stops both backend and frontend services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# ASCII Art Banner
echo "
╔══════════════════════════════════════════════╗
║     停止 Valar Web 管理系统                  ║
║     Stop Valar Web Management System         ║
╚══════════════════════════════════════════════╝
"

# Function to stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3

    if [ -f "$pid_file" ]; then
        PID=$(cat $pid_file)
        if ps -p $PID > /dev/null 2>&1; then
            print_info "停止 $service_name 服务 (PID: $PID)..."
            kill $PID 2>/dev/null || true
            sleep 1

            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID 2>/dev/null || true
            fi

            rm -f $pid_file
            print_status "$service_name 服务已停止"
        else
            print_info "$service_name 服务未运行 (PID: $PID 不存在)"
            rm -f $pid_file
        fi
    else
        print_info "$service_name PID 文件不存在"
    fi

    # Also kill any process on the port
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_info "清理端口 $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
}

# Stop backend
print_info "停止后端服务..."
stop_service "后端" "backend.pid" 8000

# Stop frontend
print_info "停止前端服务..."
stop_service "前端" "frontend.pid" 3000

# Clean up log files (optional)
read -p "是否清理日志文件？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f backend.log frontend.log
    print_status "日志文件已清理"
fi

echo ""
echo "════════════════════════════════════════════════"
print_status "所有服务已停止！"
echo "════════════════════════════════════════════════"