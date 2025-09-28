"""Dependencies for FastAPI endpoints."""
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .security import verify_token
from ..models.user import User, UserRole
from ..models.permission import AccountPermission

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user."""
    token = credentials.credentials

    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current admin user."""
    current_role = current_user.role
    if isinstance(current_role, str):
        try:
            current_role = UserRole(current_role)
        except ValueError:
            current_role = None

    if current_role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def get_user_permissions(user: User, db: Session) -> List[str]:
    """Get list of account IDs that user has permission to access."""
    user_role = user.role
    if isinstance(user_role, str):
        try:
            user_role = UserRole(user_role)
        except ValueError:
            user_role = None

    if user_role == UserRole.ADMIN:
        # Admin has access to all accounts in account_config
        from ..models.account import AccountConfig
        all_accounts = db.query(AccountConfig.account_id).all()
        return [account.account_id for account in all_accounts]

    permissions = db.query(AccountPermission).filter(
        AccountPermission.user_id == user.id
    ).all()

    return [p.account_id for p in permissions]

