"""Positions API endpoints."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ...core.database import get_db
from ...core.dependencies import get_current_user, get_user_permissions
from ...models.user import User
from ...services.valar_service import valar_service


router = APIRouter(prefix="/positions", tags=["Positions"])


class PositionsResponse(BaseModel):
    """Positions response model."""
    positions: List[Dict[str, Any]]
    update_time: str


@router.get("", response_model=PositionsResponse)
async def get_positions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    accounts: Optional[List[str]] = Query(None, description="Account IDs to query")
):
    """Get positions for specified accounts."""
    # If no accounts specified, return empty result
    if not accounts or len(accounts) == 0:
        return PositionsResponse(positions=[], update_time="")

    # Filter by user permissions
    user_permissions = get_user_permissions(current_user, db)
    target_accounts = [acc for acc in accounts if acc in user_permissions]

    if not target_accounts:
        return PositionsResponse(positions=[], update_time="")

    # Get positions from Valar service
    result = await valar_service.get_positions(target_accounts)

    return PositionsResponse(**result)


@router.get("/summary")
async def get_positions_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary of positions across all permitted accounts."""
    # Get user's permitted accounts (applies to all users including admin)
    user_permissions = get_user_permissions(current_user, db)

    if not user_permissions:
        return {"positions": [], "update_time": "", "permitted_accounts": []}

    # Use the user's permitted accounts
    accounts = user_permissions

    # Get positions from Valar service
    result = await valar_service.get_positions(accounts)

    # Add permitted accounts list to the response
    result["permitted_accounts"] = accounts

    return result