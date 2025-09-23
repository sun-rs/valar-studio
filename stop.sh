#!/bin/bash

# Valar Studio Management System - Stop Script
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

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

run_with_privilege() {
    local use_sudo="$1"
    shift
    if [ "$use_sudo" = "1" ]; then
        sudo "$@"
    else
        "$@"
    fi
}

release_port_internal() {
    local port="$1"
    local use_sudo="$2"
    local killed=1

    if command_exists fuser; then
        if run_with_privilege "$use_sudo" fuser -k "${port}/tcp" >/dev/null 2>&1; then
            killed=0
        fi
    fi

    if command_exists lsof; then
        local pids
        pids=$(run_with_privilege "$use_sudo" lsof -tiTCP:"$port" -sTCP:LISTEN -n -P 2>/dev/null)
        if [ -n "$pids" ]; then
            killed=0
            for pid in $pids; do
                if [ -n "$pid" ]; then
                    run_with_privilege "$use_sudo" kill -9 "$pid" 2>/dev/null || true
                fi
            done
        fi
    fi

    if command_exists ss; then
        local ss_output
        ss_output=$(run_with_privilege "$use_sudo" ss -tulpnH 2>/dev/null || true)
        if [ -n "$ss_output" ]; then
            local ss_pids
            ss_pids=$(echo "$ss_output" | awk -v p="$port" '$5 ~ ":"p"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
            if [ -n "$ss_pids" ]; then
                killed=0
                for pid in $ss_pids; do
                    if [ -n "$pid" ]; then
                        run_with_privilege "$use_sudo" kill -9 "$pid" 2>/dev/null || true
                    fi
                done
            fi
        fi
    fi

    return $killed
}

release_port() {
    release_port_internal "$1" 0
}

release_port_with_sudo() {
    release_port_internal "$1" 1
}

check_port() {
    local port=$1
    if command_exists lsof; then
        lsof -iTCP:$port -sTCP:LISTEN -n -P >/dev/null 2>&1 && return 0
    fi
    if command_exists ss; then
        ss -tuln 2>/dev/null | awk '{print $5}' | grep -E "[:\.]${port}$" >/dev/null 2>&1 && return 0
    fi
    if command_exists netstat; then
        netstat -tuln 2>/dev/null | awk '{print $4}' | grep -E "[:\.]${port}$" >/dev/null 2>&1 && return 0
    fi
    if command_exists fuser; then
        fuser ${port}/tcp >/dev/null 2>&1 && return 0
    fi
    return 1
}

# ASCII Art Banner
echo "
╔══════════════════════════════════════════════╗
║              Valar Studio System             ║
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
    if check_port "$port"; then
        print_info "清理端口 $port..."
        release_port "$port" || true
        sleep 1

        if check_port "$port"; then
            print_info "使用 sudo 权限清理端口 $port..."
            release_port_with_sudo "$port" || true
        fi

        if check_port "$port"; then
            print_error "端口 $port 仍被占用，请手动处理"
        else
            print_status "端口 $port 已释放"
        fi
    fi
}

# Stop backend
print_info "停止后端服务..."
stop_service "后端" "backend.pid" 8000

# Stop frontend
print_info "停止前端服务..."
stop_service "前端" "frontend.pid" 3001

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
