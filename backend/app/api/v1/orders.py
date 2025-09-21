"""Orders API endpoints."""
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ...core.database import get_db
from ...core.dependencies import get_current_user, get_user_permissions
from ...models.user import User
from ...services.valar_service import valar_service
import valar as va


router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/current-date")
async def get_current_trade_date():
    """Get current trading date."""
    current_date = va.tradedate_now().isoformat()
    return {"current_date": current_date}


@router.get("")
async def get_orders(
    tradedate: Optional[str] = Query(None, description="Trade date (YYYY-MM-DD)"),
    is_special: Optional[bool] = Query(None, description="Get only special status orders"),
    accounts: Optional[List[str]] = Query(None, description="Account IDs to query"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get orders for specified accounts."""
    # If no accounts specified, return empty result
    if not accounts or len(accounts) == 0:
        return {"orders": []}

    # Filter by user permissions
    user_permissions = get_user_permissions(current_user, db)
    target_accounts = [acc for acc in accounts if acc in user_permissions]

    if not target_accounts:
        return {"orders": []} 

    # Always use multi function for consistent data structure
    orders = await valar_service.get_orders_multi(target_accounts, tradedate, is_special)

    return {"orders": orders, "accounts": target_accounts}


@router.get("/special")
async def get_special_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    accounts: Optional[List[str]] = Query(None, description="Specific account IDs")
):
    """Get special status orders for multiple accounts."""
    # Determine which accounts to query
    if accounts and len(accounts) > 0:
        # Filter by user permissions for specified accounts
        user_permissions = get_user_permissions(current_user, db)
        target_accounts = [acc for acc in accounts if acc in user_permissions]
    else:
        # No accounts specified - return empty result instead of all accounts
        target_accounts = []

    if not target_accounts:
        return {"orders": []}

    # Get special orders from Valar service
    orders = await valar_service.get_special_orders(target_accounts)

    return {"orders": orders}


@router.get("/trades")
async def get_trades(
    trade_date: Optional[str] = Query(None, description="Trade date (YYYY-MM-DD)"),
    accounts: Optional[List[str]] = Query(None, description="Account IDs to query"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trades for specified accounts."""
    # If no accounts specified, return empty result
    if not accounts or len(accounts) == 0:
        return {"trades": []}

    # Filter by user permissions
    user_permissions = get_user_permissions(current_user, db)
    target_accounts = [acc for acc in accounts if acc in user_permissions]

    if not target_accounts:
        return {"trades": []}

    # Always use multi function for consistent data structure
    trades = await valar_service.get_trades_multi(target_accounts, trade_date)

    return {"trades": trades, "accounts": target_accounts}