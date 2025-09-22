"""Security logging API endpoints."""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.dependencies import get_current_user
from ...models.user import User, UserRole
from ...services.security_service import SecurityService
from ...schemas.security_log import (
    LoginAttemptResponse, AccessLogResponse, SecurityLogQuery, SecurityLogStats
)


router = APIRouter(prefix="/security", tags=["Security"])


@router.get("/login-attempts", response_model=dict)
async def get_login_attempts(
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    ip_address: Optional[str] = Query(None, description="IP地址过滤"),
    username: Optional[str] = Query(None, description="用户名过滤"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(50, ge=1, le=200, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取登录尝试记录（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看登录尝试记录"
        )

    query = SecurityLogQuery(
        start_date=start_date,
        end_date=end_date,
        ip_address=ip_address,
        username=username,
        page=page,
        size=size
    )

    records, total = SecurityService.get_login_attempts(db, query)

    return {
        "records": [LoginAttemptResponse.from_orm(record) for record in records],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }


@router.get("/access-logs", response_model=dict)
async def get_access_logs(
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    ip_address: Optional[str] = Query(None, description="IP地址过滤"),
    username: Optional[str] = Query(None, description="用户名过滤"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(50, ge=1, le=200, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取访问日志记录（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看访问日志"
        )

    query = SecurityLogQuery(
        start_date=start_date,
        end_date=end_date,
        ip_address=ip_address,
        username=username,
        page=page,
        size=size
    )

    records, total = SecurityService.get_access_logs(db, query)

    return {
        "records": [AccessLogResponse.from_orm(record) for record in records],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }


@router.get("/unauthorized-access", response_model=dict)
async def get_unauthorized_access_logs(
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    ip_address: Optional[str] = Query(None, description="IP地址过滤"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(50, ge=1, le=200, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取未授权访问日志记录（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看未授权访问日志"
        )

    # 只查询未授权访问（username为空的记录）
    query = SecurityLogQuery(
        start_date=start_date,
        end_date=end_date,
        ip_address=ip_address,
        username="",  # 设置为空字符串来筛选未授权访问
        page=page,
        size=size
    )

    records, total = SecurityService.get_unauthorized_access_logs(db, query)

    return {
        "records": [AccessLogResponse.from_orm(record) for record in records],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }


@router.get("/authorized-access", response_model=dict)
async def get_authorized_access_logs(
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    ip_address: Optional[str] = Query(None, description="IP地址过滤"),
    username: Optional[str] = Query(None, description="用户名过滤"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(50, ge=1, le=200, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取授权用户访问日志记录（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看授权用户访问日志"
        )

    query = SecurityLogQuery(
        start_date=start_date,
        end_date=end_date,
        ip_address=ip_address,
        username=username,
        page=page,
        size=size
    )

    records, total = SecurityService.get_authorized_access_logs(db, query)

    return {
        "records": [AccessLogResponse.from_orm(record) for record in records],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }


@router.get("/stats", response_model=SecurityLogStats)
async def get_security_stats(
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取安全统计信息（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看安全统计"
        )

    # 默认查询最近7天
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=7)
    if not end_date:
        end_date = datetime.utcnow()

    return SecurityService.get_security_stats(db, start_date, end_date)


@router.post("/cleanup-logs")
async def cleanup_logs(
    days_to_keep: int = Query(90, ge=0, le=365, description="保留天数，0表示清理全部历史记录"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """清理旧日志记录（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以清理日志"
        )

    result = SecurityService.cleanup_old_logs(db, days_to_keep)
    return {
        "message": "日志清理完成",
        "details": result
    }


@router.get("/my-login-history", response_model=dict)
async def get_my_login_history(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的登录历史（普通用户功能）"""
    query = SecurityLogQuery(
        username=current_user.username,
        page=page,
        size=size
    )

    records, total = SecurityService.get_login_attempts(db, query)

    return {
        "records": [LoginAttemptResponse.from_orm(record) for record in records],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }