"""Authentication endpoints."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ...core.database import get_db
from ...core.security import verify_password, create_access_token, get_password_hash
from ...core.dependencies import get_current_user, get_user_permissions
from ...models.user import User
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
    current_user: User = Depends(get_current_user)
):
    """验证admin用户权限（用于Nginx auth_request）"""
    # 只允许激活的admin用户访问
    if not current_user.is_active or current_user.role.value != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # 返回200状态码表示验证通过
    return {"status": "authorized", "user": current_user.username}