"""Security logging models."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from ..core.database import Base


class LoginAttempt(Base):
    """登录尝试记录"""
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    user_agent = Column(Text)
    success = Column(Boolean, default=False)
    failure_reason = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AccessLog(Base):
    """访问日志记录"""
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    user_agent = Column(Text)
    path = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    username = Column(String(50), index=True)  # 登录用户，可为空
    response_status = Column(Integer)
    response_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LoginBlock(Base):
    """登录封禁记录"""
    __tablename__ = "login_blocks"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    username = Column(String(50), index=True)  # 可为空，表示IP封禁
    block_reason = Column(String(100), default="Too many failed attempts")
    blocked_until = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())