#!/bin/bash

# Valar Web Management System - One-Click Startup Script
# This script starts both backend and frontend services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_debug() {
    echo -e "${BLUE}[D]${NC} $1"
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

# ASCII Art Banner
echo "
╔══════════════════════════════════════════════════════════════════╗
║           Valar 量化交易 Web 管理系统                            ║
║           Valar Quantitative Trading Web System                  ║
╚══════════════════════════════════════════════════════════════════╝
"

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_info "检测到 macOS 系统"
    OS_TYPE="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_info "检测到 Linux 系统"
    OS_TYPE="linux"
else
    print_error "不支持的操作系统: $OSTYPE"
    exit 1
fi

# Function to find Python with valar installed
find_python_with_valar() {
    print_info "查找安装了 valar 库的 Python..."

    # List of Python paths to check (in priority order)
    PYTHON_PATHS=(
        "/opt/homebrew/bin/python3"      # Homebrew Python 3
        "/opt/homebrew/bin/python"        # Homebrew Python
        "$(which python3 2>/dev/null)"    # Default python3 (may be aliased)
        "$(which python 2>/dev/null)"     # Default python (may be aliased)
        "/usr/local/bin/python3"          # User-installed Python 3
        "/usr/local/bin/python"           # User-installed Python
        "/usr/bin/python3"                # System Python 3
        "python3"                         # Try python3 command directly
        "python"                          # Try python command directly
    )

    # Find Python with valar
    PYTHON_EXEC=""
    for python_path in "${PYTHON_PATHS[@]}"; do
        if [ -n "$python_path" ]; then
            # Check if it's a file or a command
            if [ -f "$python_path" ] || command -v "$python_path" &>/dev/null; then
                print_debug "检查: $python_path"
                if $python_path -c "import valar" 2>/dev/null; then
                    PYTHON_EXEC="$python_path"
                    PYTHON_VERSION=$($python_path --version 2>&1 | cut -d' ' -f2)
                    print_status "找到 Python: $python_path (版本: $PYTHON_VERSION)"
                    print_status "valar 库已安装在此 Python 中"
                    break
                fi
            fi
        fi
    done

    if [ -z "$PYTHON_EXEC" ]; then
        print_error "未找到安装了 valar 库的 Python"
        echo ""
        echo "请确保已安装 valar 库。尝试以下命令之一："
        echo "  pip install valar"
        echo "  pip3 install valar"
        echo "  /opt/homebrew/bin/pip install valar"
        exit 1
    fi
}

# Function to find pip for the Python
find_pip() {
    print_info "查找对应的 pip..."

    # Try to find pip for the selected Python
    PIP_EXEC=""

    # Method 1: Use Python's pip module
    if $PYTHON_EXEC -m pip --version &>/dev/null; then
        PIP_EXEC="$PYTHON_EXEC -m pip"
        print_status "找到 pip: 使用 $PYTHON_EXEC -m pip"
    # Method 2: Look for pip in the same directory as Python
    elif [ -f "${PYTHON_EXEC%/*}/pip3" ]; then
        PIP_EXEC="${PYTHON_EXEC%/*}/pip3"
        print_status "找到 pip: $PIP_EXEC"
    elif [ -f "${PYTHON_EXEC%/*}/pip" ]; then
        PIP_EXEC="${PYTHON_EXEC%/*}/pip"
        print_status "找到 pip: $PIP_EXEC"
    # Method 3: Use system pip/pip3
    elif command -v pip3 &>/dev/null; then
        PIP_EXEC="pip3"
        print_status "使用系统 pip3"
    elif command -v pip &>/dev/null; then
        PIP_EXEC="pip"
        print_status "使用系统 pip"
    else
        print_error "未找到 pip，将跳过依赖安装"
    fi
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if command_exists lsof; then
        lsof -iTCP:$port -sTCP:LISTEN -n -P >/dev/null 2>&1 && return 0
    fi
    if command_exists ss; then
        ss -tuln | awk '{print $5}' | grep -E "[:\.]${port}$" >/dev/null 2>&1 && return 0
    fi
    if command_exists netstat; then
        netstat -tuln | awk '{print $4}' | grep -E "[:\.]${port}$" >/dev/null 2>&1 && return 0
    fi
    if command_exists fuser; then
        fuser ${port}/tcp >/dev/null 2>&1 && return 0
    fi
    return 1
}

# Function to kill process on port
kill_port() {
    local port=$1
    print_info "检查端口 $port..."

    if check_port $port; then
        print_info "端口 $port 被占用，正在释放..."

        release_port "$port" || true
        sleep 1

        if check_port $port; then
            print_info "需要管理员权限来释放端口 $port"
            release_port_with_sudo "$port" || true
            sleep 1
        fi

        # Verify port is free
        if check_port $port; then
            print_error "无法释放端口 $port，请手动停止占用该端口的进程"
            if command_exists lsof; then
                print_info "查看占用端口的进程: lsof -i :$port"
            elif command_exists ss; then
                print_info "查看占用端口的进程: ss -tulpn | grep :$port"
            else
                print_info "查看占用端口的进程: fuser ${port}/tcp"
            fi
            return 1
        else
            print_status "端口 $port 已释放"
        fi
    else
        print_status "端口 $port 可用"
    fi
    return 0
}

# Check and install dependencies
check_dependencies() {
    print_info "检查系统依赖..."

    # Find Python with valar
    find_python_with_valar

    # Find pip
    find_pip

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 14+"
        exit 1
    else
        NODE_VERSION=$(node --version)
        print_status "Node.js $NODE_VERSION 已安装"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    else
        NPM_VERSION=$(npm --version)
        print_status "npm $NPM_VERSION 已安装"
    fi
}

# Setup backend
setup_backend() {
    print_info "设置后端服务..."
    cd backend

    # Install Python dependencies if pip is available
    if [ -n "$PIP_EXEC" ] && [ -f "requirements.txt" ]; then
        print_info "检查后端依赖..."

        # Check if key packages are installed
        MISSING_PACKAGES=""
        for package in fastapi uvicorn sqlalchemy pydantic; do
            if ! $PYTHON_EXEC -c "import $package" 2>/dev/null; then
                MISSING_PACKAGES="$MISSING_PACKAGES $package"
            fi
        done

        if [ -n "$MISSING_PACKAGES" ]; then
            print_info "安装缺失的后端依赖包..."
            $PIP_EXEC install -q -r requirements.txt 2>/dev/null || {
                print_error "部分依赖安装失败，尝试继续..."
            }
        else
            print_status "后端依赖已满足"
        fi
    else
        print_info "跳过依赖检查"
    fi

    print_status "后端设置完成"
    cd ..
}

# Setup frontend
setup_frontend() {
    print_info "设置前端服务..."
    cd frontend

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_info "安装前端依赖（需要一些时间）..."
        npm install --silent
    else
        print_status "前端依赖已安装"
    fi

    print_status "前端设置完成"
    cd ..
}

# Start backend
start_backend() {
    print_info "启动后端服务..."

    # Kill existing backend process
    if ! kill_port 8000; then
        print_error "无法启动后端服务，端口 8000 被占用"
        return 1
    fi

    cd backend

    # Start backend in background using the Python with valar
    print_info "使用 $PYTHON_EXEC 启动后端..."
    nohup $PYTHON_EXEC -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid

    cd ..

    # Wait for backend to start
    print_info "等待后端服务启动..."
    for i in {1..60}; do
        # Check if process is still running
        if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo ""
            print_error "后端进程已退出，请查看 backend.log"
            tail -20 backend.log
            return 1
        fi

        # Try multiple endpoints
        if curl -s http://localhost:8000/ > /dev/null 2>&1 || \
           curl -s http://localhost:8000/health > /dev/null 2>&1 || \
           curl -s http://localhost:8000/docs > /dev/null 2>&1; then
            echo ""
            print_status "后端服务已启动 (PID: $BACKEND_PID)"
            print_status "API地址: http://localhost:8000"
            print_status "API文档: http://localhost:8000/docs"
            return 0
        fi

        # Show progress
        if [ $((i % 5)) -eq 0 ]; then
            printf " ${i}s"
        else
            printf "."
        fi
        sleep 1
    done

    echo ""
    print_error "后端服务启动超时，但进程仍在运行"
    print_info "进程 PID: $BACKEND_PID"
    print_info "请手动检查: curl http://localhost:8000/docs"
    print_info "查看日志: tail -f backend.log"
    return 0  # Continue anyway since process is running
}

# Start frontend
start_frontend() {
    print_info "启动前端服务..."

    # Kill existing frontend process
    if ! kill_port 3000; then
        print_error "无法启动前端服务，端口 3000 被占用"
        return 1
    fi

    cd frontend

    # Start frontend in background
    print_info "启动前端开发服务器..."
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid

    cd ..

    # Wait for frontend to start
    print_info "等待前端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_status "前端服务已启动 (PID: $FRONTEND_PID)"
            print_status "前端地址: http://localhost:3000"
            return 0
        fi
        printf "."
        sleep 1
    done

    echo ""
    print_error "前端服务启动失败，请查看 frontend.log"
    return 1
}

# Main execution
main() {
    # Check dependencies
    check_dependencies

    # Setup services
    print_info "初始化服务..."
    setup_backend
    setup_frontend

    # Start services
    print_info "启动服务..."
    if ! start_backend; then
        print_error "后端启动失败"
        exit 1
    fi

    if ! start_frontend; then
        print_error "前端启动失败"
        exit 1
    fi

    # Success message
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    print_status "所有服务已成功启动！"
    echo ""
    echo "  🌐 前端地址: http://localhost:3000"
    echo "  🔧 后端地址: http://localhost:8000"
    echo "  📚 API文档: http://localhost:8000/docs"
    echo ""
    echo "  👤 默认管理员账号："
    echo "     用户名: admin"
    echo "     密码: admin123"
    echo ""
    echo "  📝 查看日志:"
    echo "     后端: tail -f backend.log"
    echo "     前端: tail -f frontend.log"
    echo ""
    echo "  ⏹ 停止服务: ./stop.sh"
    echo ""
    echo "  🐍 使用的 Python: $PYTHON_EXEC"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    print_info "按 Ctrl+C 停止日志监控（服务继续在后台运行）"
    echo ""

    # Monitor logs
    tail -f backend.log frontend.log 2>/dev/null || true
}

# Trap Ctrl+C
trap 'echo ""; print_info "服务继续在后台运行，使用 ./stop.sh 停止服务"; exit 0' INT

# Run main function
main
