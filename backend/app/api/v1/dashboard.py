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


class AccountHistoryPoint(BaseModel):
    """Account history data point."""
    updatetime: str
    balance: float


class AccountHistoryData(BaseModel):
    """Account history response model."""
    account_id: str
    data: List[AccountHistoryPoint]


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