#!/usr/bin/env python3
"""
数据库迁移脚本 - 添加User表的note1和note2字段
根据CLAUDE.md的重构要求，移除email和phone字段，添加note1和note2字段
"""

import sqlite3
import os
import sys
from pathlib import Path

# 添加项目根目录到sys.path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import settings

def migrate_user_table():
    """迁移用户表，添加note1和note2字段"""
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")

    print(f"开始迁移数据库: {db_path}")

    if not os.path.exists(db_path):
        print("数据库文件不存在，跳过迁移")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 检查users表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("users表不存在，跳过迁移")
            return

        # 检查当前表结构
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"当前users表字段: {columns}")

        # 检查是否已经有note1和note2字段
        has_note1 = 'note1' in columns
        has_note2 = 'note2' in columns

        migrations_needed = []

        if not has_note1:
            migrations_needed.append("添加note1字段")
        if not has_note2:
            migrations_needed.append("添加note2字段")

        if not migrations_needed:
            print("数据库已是最新版本，无需迁移")
            return

        print(f"需要执行的迁移: {migrations_needed}")

        # 添加note1字段
        if not has_note1:
            print("添加note1字段...")
            cursor.execute("ALTER TABLE users ADD COLUMN note1 VARCHAR(500)")
            print("✓ note1字段添加成功")

        # 添加note2字段
        if not has_note2:
            print("添加note2字段...")
            cursor.execute("ALTER TABLE users ADD COLUMN note2 VARCHAR(500)")
            print("✓ note2字段添加成功")

        # 提交更改
        conn.commit()
        print("✓ 数据库迁移完成")

        # 验证迁移结果
        cursor.execute("PRAGMA table_info(users)")
        new_columns = [column[1] for column in cursor.fetchall()]
        print(f"迁移后users表字段: {new_columns}")

    except Exception as e:
        print(f"迁移失败: {e}")
        conn.rollback()
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    migrate_user_table()