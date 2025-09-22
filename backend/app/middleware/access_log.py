"""Access logging middleware."""
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..services.security_service import SecurityService


class AccessLogMiddleware(BaseHTTPMiddleware):
    """访问日志中间件"""

    def __init__(self, app, exclude_paths: set = None):
        super().__init__(app)
        # 排除不需要记录的路径（只排除技术性路径，保留业务路径用于安全监控）
        self.exclude_paths = exclude_paths or {
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/favicon.ico"
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 记录开始时间
        start_time = time.time()

        # 处理请求
        response = await call_next(request)

        # 计算响应时间
        process_time = time.time() - start_time
        response_time_ms = int(process_time * 1000)

        # 检查是否需要记录此路径
        if request.url.path not in self.exclude_paths:
            # 尝试获取用户名（如果已认证）
            username = None
            try:
                # 从Authorization header获取token并解析用户
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    from ..core.security import verify_token
                    from ..models.user import User

                    token = auth_header.split(" ")[1]
                    payload = verify_token(token)
                    if payload:
                        user_id = payload.get("sub")
                        if user_id:
                            db_temp: Session = SessionLocal()
                            try:
                                user = db_temp.query(User).filter(User.id == int(user_id)).first()
                                if user and user.is_active:
                                    username = user.username
                            finally:
                                db_temp.close()
            except Exception:
                # 忽略认证错误，继续记录日志
                pass

            # 记录访问日志
            try:
                db: Session = SessionLocal()
                try:
                    SecurityService.log_access(
                        db=db,
                        request=request,
                        response_status=response.status_code,
                        response_time_ms=response_time_ms,
                        username=username
                    )
                    db.commit()
                finally:
                    db.close()
            except Exception as e:
                # 记录日志错误但不影响请求处理
                print(f"Failed to log access: {e}")

        return response