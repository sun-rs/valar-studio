"""Settings schemas - User Management."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from ..models.user import UserRole


# User Management Schemas
class UserCreate(BaseModel):
    """User creation schema."""
    username: str
    password: str
    role: UserRole = UserRole.USER
    note1: Optional[str] = None
    note2: Optional[str] = None
    is_active: Optional[bool] = True


class UserUpdate(BaseModel):
    """User update schema."""
    username: Optional[str] = None
    password: Optional[str] = None  # 管理员可重置密码
    role: Optional[UserRole] = None
    note1: Optional[str] = None
    note2: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """User response schema."""
    id: int
    username: str
    role: UserRole
    is_active: bool
    note1: Optional[str] = None
    note2: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Personal Settings Schemas
class ProfileUpdate(BaseModel):
    """Profile update schema."""
    note1: Optional[str] = None
    note2: Optional[str] = None


class ChangePassword(BaseModel):
    """Change password schema."""
    old_password: str
    new_password: str


class ResetPasswordRequest(BaseModel):
    """Reset password request schema."""
    new_password: str