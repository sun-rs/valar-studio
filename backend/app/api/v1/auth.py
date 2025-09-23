"""Authentication endpoints."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ...core.database import get_db
from ...core.security import verify_password, create_access_token, get_password_hash, verify_token
from ...core.dependencies import get_current_user, get_user_permissions
from ...models.user import User, UserRole
from ...services.security_service import SecurityService


router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    """Login request model."""
    username: str
    password: str
    remember_me: bool = False


class UserResponse(BaseModel):
    """User response model."""
    id: int
    username: str
    role: str
    is_active: bool
    settings: dict
    permissions: List[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse


@router.post("/login", response_model=TokenResponse)
async def login(
    login_request: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """User login endpoint."""
    ip_address = SecurityService.get_client_ip(request)

    # Check if IP or user is blocked
    if SecurityService.is_blocked(db, ip_address, login_request.username):
        SecurityService.log_login_attempt(
            db, request, login_request.username, False, "IP or user is blocked"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later."
        )

    # Find user by username
    user = db.query(User).filter(User.username == login_request.username).first()

    if not user or not verify_password(login_request.password, user.password_hash):
        SecurityService.log_login_attempt(
            db, request, login_request.username, False, "Invalid credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        SecurityService.log_login_attempt(
            db, request, login_request.username, False, "Account inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Log successful login
    SecurityService.log_login_attempt(
        db, request, login_request.username, True
    )

    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token_expires = timedelta(minutes=1440)  # 24 hours
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )

    # Get user permissions
    permissions = get_user_permissions(user, db)

    # Create response
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        role=user.role.value,
        is_active=user.is_active,
        settings=user.settings or {},
        permissions=permissions,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login
    )

    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=1440 * 60,  # in seconds
        user=user_response
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """User logout endpoint."""
    return {"message": "Successfully logged out"}


@router.get("/current", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information."""
    permissions = get_user_permissions(current_user, db)

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role.value,
        is_active=current_user.is_active,
        settings=current_user.settings or {},
        permissions=permissions,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login
    )


@router.get("/verify-admin")
async def verify_admin_access(
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    """验证admin用户权限（用于Nginx auth_request，支持Header和Cookie两种认证方式）"""
    import logging
    logger = logging.getLogger(__name__)

    token = None

    # 调试：打印所有cookies和headers
    logger.info(f"Request cookies: {dict(request.cookies)}")
    logger.info(f"Request headers: {dict(request.headers)}")

    # 优先使用Authorization头
    if credentials:
        token = credentials.credentials
        logger.info(f"Using Authorization header token: {token[:20] if token else 'None'}...")
    else:
        # 如果没有Authorization头，尝试从cookie获取
        token = request.cookies.get("valar_auth")
        logger.info(f"Using cookie token: {token[:20] if token else 'None'}...")

    if not token:
        logger.warning("No authentication token found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token"
        )

    # 验证token
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )

    # 检查是否为admin
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return {"status": "authorized", "user": user.username}