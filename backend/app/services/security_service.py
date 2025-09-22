"""Security service for login rate limiting and logging."""
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from fastapi import Request

from ..models.security_log import LoginAttempt, AccessLog, LoginBlock
from ..schemas.security_log import (
    LoginAttemptCreate, AccessLogCreate, LoginBlockCreate,
    SecurityLogQuery, SecurityLogStats
)


class SecurityService:
    """安全服务类"""

    # 配置参数
    MAX_USER_ATTEMPTS = 5  # 单用户最大登录尝试次数
    USER_BLOCK_DURATION_MINUTES = 30  # 用户+IP封禁时长（分钟）
    USER_ATTEMPT_WINDOW_MINUTES = 15  # 用户尝试次数统计窗口（分钟）

    MAX_IP_ATTEMPTS = 10  # 单IP最大登录尝试次数
    IP_BLOCK_DURATION_HOURS = 48  # IP封禁时长（小时）
    IP_ATTEMPT_WINDOW_MINUTES = 1  # IP尝试次数统计窗口（分钟）

    @classmethod
    def get_client_ip(cls, request: Request) -> str:
        """获取客户端IP地址"""
        from ..utils.network import get_real_ip
        return get_real_ip(request)

    @classmethod
    def get_user_agent(cls, request: Request) -> str:
        """获取用户代理字符串"""
        from ..utils.network import get_user_agent
        return get_user_agent(request)

    @classmethod
    def is_blocked(cls, db: Session, ip_address: str, username: Optional[str] = None) -> bool:
        """检查IP或用户是否被封禁"""
        now = datetime.utcnow()

        # 检查IP封禁
        ip_block = db.query(LoginBlock).filter(
            and_(
                LoginBlock.ip_address == ip_address,
                LoginBlock.blocked_until > now
            )
        ).first()

        if ip_block:
            return True

        # 检查用户封禁
        if username:
            user_block = db.query(LoginBlock).filter(
                and_(
                    LoginBlock.username == username,
                    LoginBlock.blocked_until > now
                )
            ).first()
            if user_block:
                return True

        return False

    @classmethod
    def get_user_failed_attempts_count(cls, db: Session, ip_address: str, username: str) -> int:
        """获取指定时间窗口内的用户+IP失败尝试次数"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=cls.USER_ATTEMPT_WINDOW_MINUTES)

        return db.query(LoginAttempt).filter(
            and_(
                LoginAttempt.ip_address == ip_address,
                LoginAttempt.username == username,
                LoginAttempt.success == False,
                LoginAttempt.created_at > cutoff_time
            )
        ).count()

    @classmethod
    def get_ip_failed_attempts_count(cls, db: Session, ip_address: str) -> int:
        """获取指定时间窗口内的IP失败尝试次数"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=cls.IP_ATTEMPT_WINDOW_MINUTES)

        return db.query(LoginAttempt).filter(
            and_(
                LoginAttempt.ip_address == ip_address,
                LoginAttempt.success == False,
                LoginAttempt.created_at > cutoff_time
            )
        ).count()

    @classmethod
    def should_block_user(cls, db: Session, ip_address: str, username: str) -> bool:
        """判断是否应该封禁用户+IP组合"""
        failed_count = cls.get_user_failed_attempts_count(db, ip_address, username)
        return failed_count >= cls.MAX_USER_ATTEMPTS

    @classmethod
    def should_block_ip(cls, db: Session, ip_address: str) -> bool:
        """判断是否应该封禁整个IP"""
        failed_count = cls.get_ip_failed_attempts_count(db, ip_address)
        return failed_count >= cls.MAX_IP_ATTEMPTS

    @classmethod
    def create_user_block(cls, db: Session, ip_address: str, username: str) -> None:
        """创建用户+IP封禁记录"""
        blocked_until = datetime.utcnow() + timedelta(minutes=cls.USER_BLOCK_DURATION_MINUTES)

        block = LoginBlock(
            ip_address=ip_address,
            username=username,
            block_reason=f"User {username} from IP {ip_address}: too many failed attempts",
            blocked_until=blocked_until
        )

        db.add(block)
        db.commit()

    @classmethod
    def create_ip_block(cls, db: Session, ip_address: str) -> None:
        """创建IP封禁记录"""
        blocked_until = datetime.utcnow() + timedelta(hours=cls.IP_BLOCK_DURATION_HOURS)

        block = LoginBlock(
            ip_address=ip_address,
            username=None,  # IP封禁不针对特定用户
            block_reason=f"IP {ip_address}: too many failed attempts from multiple users",
            blocked_until=blocked_until
        )

        db.add(block)
        db.commit()

    @classmethod
    def log_login_attempt(cls, db: Session, request: Request, username: str, success: bool, failure_reason: Optional[str] = None) -> None:
        """记录登录尝试"""
        ip_address = cls.get_client_ip(request)
        user_agent = cls.get_user_agent(request)

        attempt = LoginAttempt(
            username=username,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )

        db.add(attempt)
        db.commit()

        # 如果登录失败，检查是否需要封禁
        if not success:
            # 检查是否需要封禁用户+IP组合
            if cls.should_block_user(db, ip_address, username):
                cls.create_user_block(db, ip_address, username)

            # 检查是否需要封禁整个IP（针对大规模暴力破解）
            if cls.should_block_ip(db, ip_address):
                cls.create_ip_block(db, ip_address)

    @classmethod
    def log_access(cls, db: Session, request: Request, response_status: int, response_time_ms: int, username: Optional[str] = None) -> None:
        """记录访问日志"""
        ip_address = cls.get_client_ip(request)
        user_agent = cls.get_user_agent(request)

        access_log = AccessLog(
            ip_address=ip_address,
            user_agent=user_agent,
            path=str(request.url.path),
            method=request.method,
            username=username,
            response_status=response_status,
            response_time_ms=response_time_ms
        )

        db.add(access_log)
        db.commit()

    @classmethod
    def log_unauthorized_access(cls, db: Session, ip_address: str, user_agent: str,
                               path: str, method: str, response_status: int,
                               response_time_ms: int) -> None:
        """记录未授权用户访问日志（重点安全监控）"""
        access_log = AccessLog(
            ip_address=ip_address,
            user_agent=user_agent,
            path=path,
            method=method,
            username=None,  # 未授权用户
            response_status=response_status,
            response_time_ms=response_time_ms
        )
        db.add(access_log)

    @classmethod
    def log_authorized_access(cls, db: Session, ip_address: str, user_agent: str, path: str,
                             method: str, username: str, response_status: int) -> None:
        """记录授权用户访问日志（仅安全敏感操作）"""
        access_log = AccessLog(
            ip_address=ip_address,
            user_agent=user_agent,  # 记录完整设备信息以检测异常访问
            path=path,
            method=method,
            username=username,
            response_status=response_status,
            response_time_ms=None  # 不记录响应时间
        )
        db.add(access_log)

    @classmethod
    def get_login_attempts(cls, db: Session, query: SecurityLogQuery) -> Tuple[List[LoginAttempt], int]:
        """获取登录尝试记录"""
        db_query = db.query(LoginAttempt)

        if query.start_date:
            db_query = db_query.filter(LoginAttempt.created_at >= query.start_date)

        if query.end_date:
            db_query = db_query.filter(LoginAttempt.created_at <= query.end_date)

        if query.ip_address:
            db_query = db_query.filter(LoginAttempt.ip_address.contains(query.ip_address))

        if query.username:
            db_query = db_query.filter(LoginAttempt.username.contains(query.username))

        total = db_query.count()

        records = db_query.order_by(desc(LoginAttempt.created_at)).offset(
            (query.page - 1) * query.size
        ).limit(query.size).all()

        return records, total

    @classmethod
    def get_unauthorized_access_logs(cls, db: Session, query: SecurityLogQuery) -> Tuple[List[AccessLog], int]:
        """获取未授权访问日志记录"""
        db_query = db.query(AccessLog).filter(AccessLog.username.is_(None))

        if query.start_date:
            db_query = db_query.filter(AccessLog.created_at >= query.start_date)

        if query.end_date:
            db_query = db_query.filter(AccessLog.created_at <= query.end_date)

        if query.ip_address:
            db_query = db_query.filter(AccessLog.ip_address.contains(query.ip_address))

        total = db_query.count()

        records = db_query.order_by(desc(AccessLog.created_at)).offset(
            (query.page - 1) * query.size
        ).limit(query.size).all()

        return records, total

    @classmethod
    def get_authorized_access_logs(cls, db: Session, query: SecurityLogQuery) -> Tuple[List[AccessLog], int]:
        """获取授权用户访问日志记录"""
        db_query = db.query(AccessLog).filter(AccessLog.username.isnot(None))

        if query.start_date:
            db_query = db_query.filter(AccessLog.created_at >= query.start_date)

        if query.end_date:
            db_query = db_query.filter(AccessLog.created_at <= query.end_date)

        if query.ip_address:
            db_query = db_query.filter(AccessLog.ip_address.contains(query.ip_address))

        if query.username:
            db_query = db_query.filter(AccessLog.username.contains(query.username))

        total = db_query.count()

        records = db_query.order_by(desc(AccessLog.created_at)).offset(
            (query.page - 1) * query.size
        ).limit(query.size).all()

        return records, total

    @classmethod
    def get_access_logs(cls, db: Session, query: SecurityLogQuery) -> Tuple[List[AccessLog], int]:
        """获取访问日志记录"""
        db_query = db.query(AccessLog)

        if query.start_date:
            db_query = db_query.filter(AccessLog.created_at >= query.start_date)

        if query.end_date:
            db_query = db_query.filter(AccessLog.created_at <= query.end_date)

        if query.ip_address:
            db_query = db_query.filter(AccessLog.ip_address.contains(query.ip_address))

        if query.username:
            db_query = db_query.filter(AccessLog.username.contains(query.username))

        total = db_query.count()

        records = db_query.order_by(desc(AccessLog.created_at)).offset(
            (query.page - 1) * query.size
        ).limit(query.size).all()

        return records, total

    @classmethod
    def get_security_stats(cls, db: Session, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> SecurityLogStats:
        """获取安全统计信息"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()

        # 统计登录尝试
        total_attempts = db.query(LoginAttempt).filter(
            and_(
                LoginAttempt.created_at >= start_date,
                LoginAttempt.created_at <= end_date
            )
        ).count()

        failed_attempts = db.query(LoginAttempt).filter(
            and_(
                LoginAttempt.created_at >= start_date,
                LoginAttempt.created_at <= end_date,
                LoginAttempt.success == False
            )
        ).count()

        # 统计唯一IP
        unique_ips = db.query(func.count(func.distinct(AccessLog.ip_address))).filter(
            and_(
                AccessLog.created_at >= start_date,
                AccessLog.created_at <= end_date
            )
        ).scalar() or 0

        # 统计被封禁的IP
        blocked_ips = db.query(func.count(func.distinct(LoginBlock.ip_address))).filter(
            LoginBlock.blocked_until > datetime.utcnow()
        ).scalar() or 0

        date_range = f"{start_date.strftime('%Y-%m-%d')} 至 {end_date.strftime('%Y-%m-%d')}"

        return SecurityLogStats(
            total_login_attempts=total_attempts,
            failed_login_attempts=failed_attempts,
            unique_ips=unique_ips,
            blocked_ips=blocked_ips,
            date_range=date_range
        )

    @classmethod
    def cleanup_old_logs(cls, db: Session, days_to_keep: int = 90) -> dict:
        """清理旧日志记录"""
        # 如果 days_to_keep 为 0，表示清理全部历史记录
        if days_to_keep == 0:
            # 清理所有登录尝试记录
            login_attempts_deleted = db.query(LoginAttempt).delete()

            # 清理所有访问日志
            access_logs_deleted = db.query(AccessLog).delete()

            cutoff_date_str = "全部历史记录"
        else:
            # 清理指定天数之前的记录
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

            # 清理登录尝试记录
            login_attempts_deleted = db.query(LoginAttempt).filter(
                LoginAttempt.created_at < cutoff_date
            ).delete()

            # 清理访问日志
            access_logs_deleted = db.query(AccessLog).filter(
                AccessLog.created_at < cutoff_date
            ).delete()

            cutoff_date_str = cutoff_date.isoformat()

        # 始终清理过期的封禁记录（与天数设置无关）
        expired_blocks_deleted = db.query(LoginBlock).filter(
            LoginBlock.blocked_until < datetime.utcnow()
        ).delete()

        db.commit()

        return {
            "login_attempts_deleted": login_attempts_deleted,
            "access_logs_deleted": access_logs_deleted,
            "expired_blocks_deleted": expired_blocks_deleted,
            "cutoff_date": cutoff_date_str,
            "cleanup_type": "全部历史记录" if days_to_keep == 0 else f"过去{days_to_keep}天"
        }