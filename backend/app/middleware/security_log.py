"""Smart security logging middleware with three log categories."""
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..services.security_service import SecurityService
from ..utils.network import get_real_ip, get_user_agent


class SecurityLogMiddleware(BaseHTTPMiddleware):
    """
    智能安全日志中间件
    根据用户认证状态和路径分类记录：
    1. 未授权访问日志 - 重点监控外来访问
    2. 授权用户访问日志 - 简化记录
    3. 登录记录已在auth.py中单独处理
    """

    def __init__(self, app, exclude_paths: set = None):
        super().__init__(app)
        # 完全排除的技术性路径
        self.exclude_paths = exclude_paths or {
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/favicon.ico"
        }

        # 安全敏感路径（即使已登录也要记录）
        self.security_paths = {
            "/",
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
            "/api/v1/settings",
            "/api/v1/account-config"
        }

        # 只记录未授权访问的API路径模式
        self.api_patterns = [
            "/api/v1/",
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response_time_ms = int(process_time * 1000)

        # 检查是否需要记录
        if request.url.path in self.exclude_paths:
            return response

        # 获取真实IP和用户代理
        real_ip = get_real_ip(request)
        user_agent = get_user_agent(request)

        # 尝试获取认证用户信息
        username = None
        is_authenticated = False
        try:
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
                                is_authenticated = True
                        finally:
                            db_temp.close()
        except Exception:
            pass

        # 决定是否记录此次访问
        should_log = self._should_log_access(request.url.path, is_authenticated)

        if should_log:
            try:
                db: Session = SessionLocal()
                try:
                    # 未授权访问：记录详细信息用于安全监控
                    if not is_authenticated:
                        SecurityService.log_unauthorized_access(
                            db=db,
                            ip_address=real_ip,
                            user_agent=user_agent,
                            path=request.url.path,
                            method=request.method,
                            response_status=response.status_code,
                            response_time_ms=response_time_ms
                        )
                    else:
                        # 授权用户访问：只记录安全敏感操作
                        if self._is_security_sensitive(request.url.path):
                            SecurityService.log_authorized_access(
                                db=db,
                                ip_address=real_ip,
                                user_agent=user_agent,
                                path=request.url.path,
                                method=request.method,
                                username=username,
                                response_status=response.status_code
                            )

                    db.commit()
                finally:
                    db.close()
            except Exception as e:
                print(f"Failed to log access: {e}")

        return response

    def _should_log_access(self, path: str, is_authenticated: bool) -> bool:
        """判断是否应该记录此次访问"""
        # 未授权用户：记录所有访问（高安全级别监控）
        if not is_authenticated:
            return True  # 记录所有未授权用户的访问尝试，包括随机路径探测

        # 授权用户：只记录安全敏感操作
        else:
            if self._is_security_sensitive(path):
                return True

        return False

    def _is_security_sensitive(self, path: str) -> bool:
        """判断是否为安全敏感路径"""
        return any(sensitive_path in path for sensitive_path in self.security_paths)