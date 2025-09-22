"""Account configuration API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...core.database import get_db
from ...core.dependencies import get_current_user
from ...models.user import User, UserRole
from ...models.account import AccountConfig
from ...models.permission import AccountPermission
from ...schemas.account_config import (
    AccountConfigCreate,
    AccountConfigUpdate,
    AccountConfigResponse,
    AccountPermissionResponse,
    AccountPermissionUpdate,
    AccountPermissionDetail
)

router = APIRouter()


@router.get("/accounts", response_model=List[AccountConfigResponse])
async def get_all_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取所有交易账户（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看所有交易账户"
        )

    accounts = db.query(AccountConfig).all()
    return accounts


@router.post("/accounts", response_model=AccountConfigResponse)
async def create_account(
    account_data: AccountConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新的交易账户（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以创建交易账户"
        )

    # 检查账户ID是否已存在
    existing = db.query(AccountConfig).filter(
        AccountConfig.account_id == account_data.account_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="账户ID已存在"
        )

    account = AccountConfig(
        **account_data.model_dump(),
        created_by=current_user.id
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return account


@router.put("/accounts/{account_id}", response_model=AccountConfigResponse)
async def update_account(
    account_id: str,
    account_data: AccountConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新交易账户信息（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以更新交易账户"
        )

    account = db.query(AccountConfig).filter(
        AccountConfig.account_id == account_id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交易账户不存在"
        )

    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    return account


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除交易账户（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以删除交易账户"
        )

    account = db.query(AccountConfig).filter(
        AccountConfig.account_id == account_id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交易账户不存在"
        )

    # 删除相关的权限记录
    db.query(AccountPermission).filter(
        AccountPermission.account_id == account_id
    ).delete()

    db.delete(account)
    db.commit()

    return {"message": "交易账户删除成功"}


@router.get("/permissions", response_model=List[AccountPermissionDetail])
async def get_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取权限矩阵（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看权限矩阵"
        )

    # Join permissions with users and accounts to get detailed information
    permissions_query = db.query(
        AccountPermission.id,
        AccountPermission.user_id,
        User.username,
        AccountPermission.account_id,
        AccountConfig.account_name,
        AccountPermission.permission_type,
        AccountPermission.created_at
    ).join(
        User, AccountPermission.user_id == User.id
    ).outerjoin(
        AccountConfig, AccountPermission.account_id == AccountConfig.account_id
    ).all()

    return [
        AccountPermissionDetail(
            id=p.id,
            user_id=p.user_id,
            username=p.username,
            account_id=p.account_id,
            account_name=p.account_name,
            permission_type=p.permission_type,
            created_at=p.created_at
        )
        for p in permissions_query
    ]


@router.put("/permissions")
async def update_permissions(
    permissions_data: List[AccountPermissionUpdate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新权限分配（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以更新权限分配"
        )

    for perm_data in permissions_data:
        # 检查是否已存在权限记录
        existing = db.query(AccountPermission).filter(
            and_(
                AccountPermission.user_id == perm_data.user_id,
                AccountPermission.account_id == perm_data.account_id
            )
        ).first()

        if existing:
            # 更新现有权限
            existing.permission_type = perm_data.permission_type
        else:
            # 创建新权限
            permission = AccountPermission(
                **perm_data.model_dump(),
                created_by=current_user.id
            )
            db.add(permission)

    db.commit()

    return {"message": "权限分配更新成功"}


@router.get("/permissions/user/{user_id}")
async def get_user_permissions(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取特定用户的权限（管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以查看用户权限"
        )

    permissions = db.query(AccountPermission).filter(
        AccountPermission.user_id == user_id
    ).all()

    account_ids = [p.account_id for p in permissions]
    return account_ids


@router.post("/permissions/user/{user_id}")
async def set_user_permissions(
    user_id: int,
    account_ids: List[str] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """设置用户的权限（替换式更新，管理员功能）"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以设置用户权限"
        )

    # 检查用户是否存在
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 删除用户现有的所有权限
    db.query(AccountPermission).filter(
        AccountPermission.user_id == user_id
    ).delete()

    # 为每个account_id创建新权限记录
    for account_id in account_ids:
        # 检查账户是否存在
        account = db.query(AccountConfig).filter(
            AccountConfig.account_id == account_id
        ).first()
        if account:
            permission = AccountPermission(
                user_id=user_id,
                account_id=account_id,
                permission_type="view",
                created_by=current_user.id
            )
            db.add(permission)

    db.commit()

    return {"message": "用户权限设置成功"}


@router.get("/my-accounts", response_model=List[AccountConfigResponse])
async def get_my_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的交易账户（所有用户可见）"""
    # 所有用户（包括管理员）只能看到被分配的账户
    permissions = db.query(AccountPermission).filter(
        AccountPermission.user_id == current_user.id
    ).all()

    account_ids = [p.account_id for p in permissions]
    if not account_ids:
        return []

    accounts = db.query(AccountConfig).filter(
        AccountConfig.account_id.in_(account_ids)
    ).all()

    return accounts