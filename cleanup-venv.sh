#!/bin/bash

# Script to cleanup virtual environment created by old scripts

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
║         清理虚拟环境 - Virtual Environment Cleanup               ║
╚══════════════════════════════════════════════════════════════════╝
"

# Check if virtual environment exists
VENV_PATH="/Users/sun/Desktop/DEV/valar-web/backend/venv"

if [ -d "$VENV_PATH" ]; then
    print_info "发现虚拟环境: $VENV_PATH"

    # Show size
    SIZE=$(du -sh "$VENV_PATH" | cut -f1)
    print_info "虚拟环境大小: $SIZE"

    # Ask for confirmation
    echo ""
    echo "说明: 新版本的启动脚本不再需要虚拟环境"
    echo "      将直接使用系统 Python 和已安装的 valar 库"
    echo ""
    read -p "是否删除虚拟环境? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "正在删除虚拟环境..."
        rm -rf "$VENV_PATH"

        if [ ! -d "$VENV_PATH" ]; then
            print_status "虚拟环境已删除"
            print_info "释放了 $SIZE 磁盘空间"
        else
            print_error "删除失败"
        fi
    else
        print_info "取消删除"
    fi
else
    print_status "未发现虚拟环境"
fi

# Check for other common virtual environment names
echo ""
print_info "检查其他可能的虚拟环境目录..."

OTHER_VENVS=""
for dir in ".venv" "env" ".env"; do
    if [ -d "/Users/sun/Desktop/DEV/valar-web/backend/$dir" ]; then
        # Check if it's actually a virtual environment (has bin/python)
        if [ -f "/Users/sun/Desktop/DEV/valar-web/backend/$dir/bin/python" ]; then
            OTHER_VENVS="$OTHER_VENVS /Users/sun/Desktop/DEV/valar-web/backend/$dir"
        fi
    fi
done

if [ -n "$OTHER_VENVS" ]; then
    print_info "发现其他虚拟环境:"
    for venv in $OTHER_VENVS; do
        echo "  - $venv"
    done

    read -p "是否删除这些虚拟环境? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for venv in $OTHER_VENVS; do
            rm -rf "$venv"
            print_status "已删除: $venv"
        done
    fi
else
    print_status "没有发现其他虚拟环境"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
print_status "清理完成！"
echo ""
echo "提示: 新版启动脚本将使用系统 Python，确保能访问 valar 库"
echo "════════════════════════════════════════════════════════════════════"