"""Account configuration schemas."""
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel


class AccountConfigBase(BaseModel):
    """Account configuration base schema."""
    account_id: str
    account_name: Optional[str] = None
    initial_capital: float = 0.0
    currency: str = "CNY"
    broker: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []
    config: dict = {}


class AccountConfigCreate(AccountConfigBase):
    """Account configuration create schema."""
    pass


class AccountConfigUpdate(BaseModel):
    """Account configuration update schema."""
    account_name: Optional[str] = None
    initial_capital: Optional[float] = None
    currency: Optional[str] = None
    broker: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    config: Optional[dict] = None


class AccountConfigResponse(AccountConfigBase):
    """Account configuration response schema."""
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class AccountPermissionBase(BaseModel):
    """Account permission base schema."""
    user_id: int
    account_id: str
    permission_type: str = "view"


class AccountPermissionUpdate(AccountPermissionBase):
    """Account permission update schema."""
    pass


class AccountPermissionResponse(AccountPermissionBase):
    """Account permission response schema."""
    id: int
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class AccountPermissionDetail(BaseModel):
    """Enhanced account permission with user and account details."""
    id: int
    user_id: int
    username: str
    account_id: str
    account_name: Optional[str] = None
    permission_type: str
    created_at: datetime

    class Config:
        from_attributes = True