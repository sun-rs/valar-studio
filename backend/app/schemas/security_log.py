"""Security logging schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class LoginAttemptBase(BaseModel):
    username: str
    ip_address: str
    user_agent: Optional[str] = None
    success: bool = False
    failure_reason: Optional[str] = None


class LoginAttemptCreate(LoginAttemptBase):
    pass


class LoginAttemptResponse(LoginAttemptBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AccessLogBase(BaseModel):
    ip_address: str
    user_agent: Optional[str] = None
    path: str
    method: str
    username: Optional[str] = None
    response_status: Optional[int] = None
    response_time_ms: Optional[int] = None


class AccessLogCreate(AccessLogBase):
    pass


class AccessLogResponse(AccessLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LoginBlockBase(BaseModel):
    ip_address: str
    username: Optional[str] = None
    block_reason: str = "Too many failed attempts"
    blocked_until: datetime


class LoginBlockCreate(LoginBlockBase):
    pass


class LoginBlockResponse(LoginBlockBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityLogQuery(BaseModel):
    """安全日志查询参数"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    ip_address: Optional[str] = None
    username: Optional[str] = None
    log_type: Optional[str] = None  # login_attempts, access_logs
    page: int = 1
    size: int = 100


class SecurityLogStats(BaseModel):
    """安全日志统计"""
    total_login_attempts: int
    failed_login_attempts: int
    unique_ips: int
    blocked_ips: int
    date_range: str