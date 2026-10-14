"""Dashboard API endpoints."""
from typing import List, Optional, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ...core.database import get_db
from ...core.dependencies import get_current_user, get_user_permissions
from ...models.user import User
from ...models.account import AccountConfig
from ...services.valar_service import valar_service
from ...services import valar_api


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardSummary(BaseModel):
    """Dashboard summary response model."""
    total_balance: float
    net_profit: float
    total_margin: float
    available_funds: float
    profit_rate: float
    update_time: str
    accounts_count: int


class AccountSummary(BaseModel):
    """Account summary response model."""
    account_id: str
    account_name: Optional[str] = None
    balance: float
    float_pnl: float
    total_pnl: float
    margin: float
    margin_rate: str
    available: float
    initial_capital: float
    frozen: float
    profit_rate: float
    update_time: str
    has_data: bool = True  # False 表示该账户在数据源（MongoDB）中暂无数据，前端展示占位行


class AccountHistoryPoint(BaseModel):
    """Account history data point."""
    updatetime: str
    balance: float


class AccountHistoryData(BaseModel):
    """Account history response model."""
    account_id: str
    data: List[AccountHistoryPoint]


class DashboardAccountPreference(BaseModel):
    """Single account preference entry (ordered).

    visible: 是否在仪表盘显示（在「我的交易账户」中设置）
    included: 是否参与顶部卡片汇总（在仪表盘账户明细中勾选，仅对可见账户有意义）
    """
    account_id: str
    included: bool = True
    visible: bool = True


class DashboardPreferences(BaseModel):
    """Dashboard preferences: ordered accounts with inclusion flags."""
    accounts: List[DashboardAccountPreference] = []


DASHBOARD_PREF_KEY = "dashboard_accounts"


def _merge_preferences(stored: List[dict], permitted: List[str]) -> List[DashboardAccountPreference]:
    """Merge stored preferences with current permissions.

    - 只保留当前有权限的账户，维持用户保存的顺序；
    - 新获得权限的账户追加在末尾，默认可见且勾选。
    """
    permitted_set = set(permitted)
    merged: List[DashboardAccountPreference] = []
    seen = set()

    for entry in stored:
        account_id = entry.get("account_id")
        if account_id in permitted_set and account_id not in seen:
            merged.append(DashboardAccountPreference(
                account_id=account_id,
                included=bool(entry.get("included", True)),
                visible=bool(entry.get("visible", True))
            ))
            seen.add(account_id)

    for account_id in permitted:
        if account_id not in seen:
            merged.append(DashboardAccountPreference(account_id=account_id, included=True, visible=True))
            seen.add(account_id)

    return merged


@router.get("/preferences", response_model=DashboardPreferences)
async def get_dashboard_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的仪表盘账户偏好（勾选状态与排序，持久化在用户设置中）。"""
    user_permissions = get_user_permissions(current_user, db)
    stored = (current_user.settings or {}).get(DASHBOARD_PREF_KEY, [])
    return DashboardPreferences(accounts=_merge_preferences(stored, user_permissions))


@router.put("/preferences", response_model=DashboardPreferences)
async def save_dashboard_preferences(
    preferences: DashboardPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """保存当前用户的仪表盘账户偏好（勾选状态与排序）。"""
    user_permissions = get_user_permissions(current_user, db)

    # 只接受当前有权限的账户，避免越权写入
    permitted_set = set(user_permissions)
    cleaned = [
        {"account_id": p.account_id, "included": p.included, "visible": p.visible}
        for p in preferences.accounts
        if p.account_id in permitted_set
    ]

    settings_dict = dict(current_user.settings or {})
    settings_dict[DASHBOARD_PREF_KEY] = cleaned
    current_user.settings = settings_dict
    db.commit()

    return DashboardPreferences(accounts=_merge_preferences(cleaned, user_permissions))


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    accounts: Optional[List[str]] = Query(None, description="Specific accounts to query")
):
    """Get dashboard summary statistics."""
    # Get user permissions first
    user_permissions = get_user_permissions(current_user, db)

    # If no accounts specified, use all user's permitted accounts
    if not accounts or len(accounts) == 0:
        accounts = user_permissions
    else:
        # Filter specified accounts by user permissions
        accounts = [acc for acc in accounts if acc in user_permissions]

    if not accounts:
        return DashboardSummary(
            total_balance=0,
            net_profit=0,
            total_margin=0,
            available_funds=0,
            profit_rate=0,
            update_time=datetime.now().isoformat(),
            accounts_count=0
        )

    # Get initial capitals from database
    account_configs = db.query(AccountConfig).filter(
        AccountConfig.account_id.in_(accounts)
    ).all()

    initial_capitals = {
        config.account_id: config.initial_capital
        for config in account_configs
    }

    # Add default initial capital for accounts not in config
    for account_id in accounts:
        if account_id not in initial_capitals:
            initial_capitals[account_id] = 0.0

    # Get summary from Valar service
    summary = await valar_service.get_dashboard_summary(accounts, initial_capitals)

    return DashboardSummary(**summary)


@router.get("/accounts", response_model=List[AccountSummary])
async def get_accounts_detail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    accounts: Optional[List[str]] = Query(None, description="Specific accounts to query")
):
    """Get detailed information for all permitted accounts."""
    # Get user permissions first
    user_permissions = get_user_permissions(current_user, db)

    # If no accounts specified, use all user's permitted accounts
    if not accounts or len(accounts) == 0:
        accounts = user_permissions
    else:
        # Filter specified accounts by user permissions
        accounts = [acc for acc in accounts if acc in user_permissions]

    # 按用户偏好过滤：在「我的交易账户」中被设置为隐藏的账户不出现在仪表盘
    stored_prefs = (current_user.settings or {}).get(DASHBOARD_PREF_KEY, [])
    visible_ids = {
        p.account_id for p in _merge_preferences(stored_prefs, user_permissions) if p.visible
    }
    accounts = [acc for acc in accounts if acc in visible_ids]

    if not accounts:
        return []

    # Get initial capitals and names from database
    account_configs = db.query(AccountConfig).filter(
        AccountConfig.account_id.in_(accounts)
    ).all()

    initial_capitals = {}
    account_names = {}
    for config in account_configs:
        initial_capitals[config.account_id] = config.initial_capital
        account_names[config.account_id] = config.account_name

    # Add default initial capital for accounts not in config
    for account_id in accounts:
        if account_id not in initial_capitals:
            initial_capitals[account_id] = 0.0

    # Get account summaries from Valar service
    summaries = await valar_service.get_account_summary(accounts, initial_capitals)

    # Add account names
    for summary in summaries:
        summary["account_name"] = account_names.get(summary["account_id"])

    # 为在数据源中查不到数据的账户补占位行，避免界面上"凭空消失"造成困惑
    returned_ids = {s["account_id"] for s in summaries}
    for account_id in accounts:
        if account_id not in returned_ids:
            summaries.append({
                "account_id": account_id,
                "account_name": account_names.get(account_id),
                "balance": 0.0,
                "float_pnl": 0.0,
                "total_pnl": 0.0,
                "margin": 0.0,
                "margin_rate": "-",
                "available": 0.0,
                "initial_capital": initial_capitals.get(account_id, 0.0),
                "frozen": 0.0,
                "profit_rate": 0.0,
                "update_time": "",
                "has_data": False,
            })

    return [AccountSummary(**s) for s in summaries]


@router.get("/history", response_model=List[AccountHistoryData])
async def get_accounts_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    accounts: Optional[List[str]] = Query(None, description="Specific accounts to query"),
    days: int = Query(5, description="Number of days to query", ge=1, le=30)
):
    """Get account balance history for the specified accounts and days."""
    # Get user permissions first
    user_permissions = get_user_permissions(current_user, db)

    # If no accounts specified, use all user's permitted accounts
    if not accounts or len(accounts) == 0:
        accounts = user_permissions
    else:
        # Filter specified accounts by user permissions
        accounts = [acc for acc in accounts if acc in user_permissions]

    if not accounts:
        return []

    # Get history data for each account
    history_data = []
    for account_id in accounts:
        try:
            # Get account history from valar API
            history_df = valar_api.get_account_his(account_id, days=days)

            if not history_df.empty:
                # Convert DataFrame to list of data points
                data_points = []
                for timestamp, row in history_df.iterrows():
                    data_points.append(AccountHistoryPoint(
                        updatetime=timestamp.isoformat(),
                        balance=float(row['balance'])
                    ))

                history_data.append(AccountHistoryData(
                    account_id=account_id,
                    data=data_points
                ))
            else:
                # Empty data for account
                history_data.append(AccountHistoryData(
                    account_id=account_id,
                    data=[]
                ))
        except Exception as e:
            # Skip accounts with errors silently
            history_data.append(AccountHistoryData(
                account_id=account_id,
                data=[]
            ))

    return history_data