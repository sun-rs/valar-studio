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

show_port_info() {
    local port=$1
    echo ""
    echo "端口 $port 的进程信息:"
    echo "----------------------------------------"
    if command_exists lsof; then
        lsof -iTCP:$port -sTCP:LISTEN -n -P 2>/dev/null || echo "端口 $port 未被占用"
    elif command_exists ss; then
        local ss_output
        ss_output=$(ss -tulpnH 2>/dev/null | awk -v p="$port" '$5 ~ ":"p"$"')
        if [ -n "$ss_output" ]; then
            echo "$ss_output"
        else
            echo "端口 $port 未被占用"
        fi
    elif command_exists netstat; then
        local ns_output
        ns_output=$(netstat -tulnp 2>/dev/null | awk -v p="$port" '$4 ~ ":"p"$"')
        if [ -n "$ns_output" ]; then
            echo "$ns_output"
        else
            echo "端口 $port 未被占用"
        fi
    else
        echo "未找到可用的端口分析工具，请安装 lsof/ss/netstat"
    fi
    echo "----------------------------------------"
}

echo "
╔══════════════════════════════════════════════════════════════════╗
║             端口清理工具 - Port Cleanup Tool                     ║
╚══════════════════════════════════════════════════════════════════╝
"

# Check port 8000 (Backend)
print_info "检查后端端口 8000..."
show_port_info 8000

if check_port 8000; then
    read -p "是否强制释放端口 8000? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "释放端口 8000..."

        release_port 8000 || true
        sleep 1

        if check_port 8000; then
            print_info "使用 sudo 权限释放端口..."
            release_port_with_sudo 8000 || true
        fi

        if check_port 8000; then
            print_error "无法释放端口 8000"
        else
            print_status "端口 8000 已释放"
        fi
    fi
else
    print_status "端口 8000 未被占用"
fi

# Check port 3001 (Frontend)
print_info "检查前端端口 3001..."
show_port_info 3001

if check_port 3001; then
    read -p "是否强制释放端口 3001? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "释放端口 3001..."

        release_port 3001 || true
        sleep 1

        if check_port 3001; then
            print_info "使用 sudo 权限释放端口..."
            release_port_with_sudo 3001 || true
        fi

        if check_port 3001; then
            print_error "无法释放端口 3001"
        else
            print_status "端口 3001 已释放"
        fi
    fi
else
    print_status "端口 3001 未被占用"
fi

# Kill Python uvicorn processes
print_info "检查 uvicorn 进程..."
if pgrep -f "uvicorn" > /dev/null 2>&1; then
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
if pgrep -f "vite" > /dev/null 2>&1; then
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
