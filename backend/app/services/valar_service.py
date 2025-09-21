"""Valar data service integration."""
import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime, date
import pandas as pd
from . import valar_api
import logging

logger = logging.getLogger(__name__)


class ValarService:
    """Service for interacting with Valar API and MongoDB data."""

    def __init__(self):
        """Initialize the Valar service."""
        self.mongo_client = None

    async def get_account_summary(self, account_ids: List[str], initial_capitals: Dict[str, float]) -> List[Dict]:
        """
        Get account summary for multiple accounts.

        Args:
            account_ids: List of account IDs
            initial_capitals: Dictionary mapping account IDs to their initial capital

        Returns:
            List of account summaries
        """
        try:
            # Run synchronous function in thread pool
            df = await asyncio.to_thread(
                valar_api.get_accounts,
                initial_capitals
            )

            if df is None or df.empty:
                return []

            # Convert DataFrame to list of dictionaries
            accounts = []
            for _, row in df.iterrows():
                account = {
                    "account_id": row["accountid"],
                    "balance": float(row["balance"]),
                    "float_pnl": float(row["float_pnl"]),
                    "total_pnl": float(row["total_pnl"]),
                    "margin": float(row["margin"]),
                    "margin_rate": row["margin%"],
                    "available": float(row["available"]),
                    "initial_capital": float(row["init_cash"]),
                    "frozen": float(row["frozen"]),
                    "update_time": row["updatetime"],
                    "profit_rate": ((row["balance"] - row["init_cash"]) / row["init_cash"] * 100) if row["init_cash"] > 0 else 0
                }
                accounts.append(account)

            return accounts
        except Exception as e:
            logger.error(f"Error getting account summary: {e}")
            return []

    async def get_dashboard_summary(self, account_ids: List[str], initial_capitals: Dict[str, float]) -> Dict:
        """
        Get dashboard summary statistics.

        Args:
            account_ids: List of account IDs
            initial_capitals: Dictionary mapping account IDs to their initial capital

        Returns:
            Dashboard summary dictionary
        """
        accounts = await self.get_account_summary(account_ids, initial_capitals)
        
        if not accounts:
            return {
                "total_balance": 0,
                "net_profit": 0,
                "total_margin": 0,
                "available_funds": 0,
                "profit_rate": 0,
                "update_time": datetime.now().isoformat(),
                "accounts_count": 0
            }

        total_balance = sum(acc["balance"] for acc in accounts)
        total_initial = sum(acc["initial_capital"] for acc in accounts)
        total_margin = sum(acc["margin"] for acc in accounts)
        total_available = sum(acc["available"] for acc in accounts)

        return {
            "total_balance": total_balance,
            "net_profit": total_balance - total_initial,
            "total_margin": total_margin,
            "available_funds": total_available,
            "profit_rate": ((total_balance - total_initial) / total_initial * 100) if total_initial > 0 else 0,
            "update_time": datetime.now().isoformat(),
            "accounts_count": len(accounts)
        }

    async def get_positions(self, account_ids: List[str]) -> Dict:
        """
        Get positions for one or multiple accounts.

        Args:
            account_ids: List of account IDs

        Returns:
            Dictionary containing positions and metadata
        """
        try:
            # Use the unified get_positions function
            df = await asyncio.to_thread(
                valar_api.get_positions,
                account_ids
            )

            if df is None or df.empty:
                return {"positions": [], "update_time": datetime.now().isoformat()}

            # Ensure data is sorted by margin descending (largest first)
            # This provides protection against external library changes
            if 'margin' in df.columns:
                df = df.sort_values('margin', ascending=False).reset_index(drop=True)

            # Convert DataFrame to list of dictionaries
            positions = df.to_dict('records')

            # Process any NaN values
            for pos in positions:
                for key, value in pos.items():
                    if pd.isna(value):
                        pos[key] = None

            return {
                "positions": positions,
                "update_time": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return {"positions": [], "update_time": datetime.now().isoformat()}

    async def get_orders(self, account_id: str, tradedate: str, is_special: bool) -> List[Dict]:
        """
        Get orders for an account.

        Args:
            account_id: Account ID
            is_special: If True, return only special status orders

        Returns:
            List of orders
        """
        try:
            df = await asyncio.to_thread(
                valar_api.get_orders,
                account_id,
                tradedate,
                is_special
            )

            if df is None or df.empty:
                return []

            orders = df.to_dict('records')

            # Process any NaN values
            for order in orders:
                for key, value in order.items():
                    if pd.isna(value):
                        order[key] = None

            return orders
        except Exception as e:
            logger.error(f"Error getting orders: {e}")
            return []

    async def get_trades(self, account_id: str, tradedate: str = None) -> List[Dict]:
        """
        Get trades for an account.

        Args:
            account_id: Account ID
            tradedate: Trade date (optional)

        Returns:
            List of trades
        """
        try:
            df = await asyncio.to_thread(
                valar_api.get_trades,
                account_id,
                tradedate
            )

            if df is None or df.empty:
                return []

            trades = df.to_dict('records')

            # Process any NaN values
            for trade in trades:
                for key, value in trade.items():
                    if pd.isna(value):
                        trade[key] = None

            return trades
        except Exception as e:
            logger.error(f"Error getting trades: {e}")
            return []

    async def get_special_orders(self, account_ids: List[str]) -> List[Dict]:
        """
        Get special status orders for multiple accounts.

        Args:
            account_ids: List of account IDs

        Returns:
            List of special orders
        """
        try:
            df = await asyncio.to_thread(
                valar_api.get_special_orders,
                account_ids
            )

            if df is None or df.empty:
                return []

            orders = df.to_dict('records')

            # Process any NaN values
            for order in orders:
                for key, value in order.items():
                    if pd.isna(value):
                        order[key] = None

            return orders
        except Exception as e:
            logger.error(f"Error getting special orders: {e}")
            return []

    async def get_account_history(self, account_id: str, start_date: Optional[date] = None) -> List[Dict]:
        """
        Get account balance history.

        Args:
            account_id: Account ID
            start_date: Start date for history

        Returns:
            List of historical account data
        """
        try:
            history = await asyncio.to_thread(
                valar_api.get_account_his,
                account_id,
                start_date
            )

            # Process MongoDB ObjectId if present
            for record in history:
                if '_id' in record:
                    record['_id'] = str(record['_id'])

            return history
        except Exception as e:
            logger.error(f"Error getting account history: {e}")
            return []

    async def get_orders_multi(self, account_ids: List[str], tradedate: str, is_special: bool | None = None) -> List[Dict]:
        """
        Get orders for multiple accounts.

        Args:
            account_ids: List of account IDs
            tradedate: Trade date string
            is_special: If True, return only special status orders, if False return all orders, if None ignore special status

        Returns:
            List of orders
        """
        try:
            df = await asyncio.to_thread(
                valar_api.get_orders_multi,
                account_ids,
                tradedate,
                is_special
            )

            if df is None or df.empty:
                return []

            # Ensure orders are sorted by updatetime descending (latest first)
            # This provides protection against external library changes
            if 'updatetime' in df.columns:
                df = df.sort_values('updatetime', ascending=False).reset_index(drop=True)

            orders = df.to_dict('records')

            # Process any NaN values
            for order in orders:
                for key, value in order.items():
                    if pd.isna(value):
                        order[key] = None

            return orders
        except Exception as e:
            logger.error(f"Error getting multi-account orders: {e}")
            return []

    async def get_trades_multi(self, account_ids: List[str], tradedate: str) -> List[Dict]:
        """
        Get trades for multiple accounts.

        Args:
            account_ids: List of account IDs
            tradedate: Trade date string

        Returns:
            List of trades
        """
        try:
            df = await asyncio.to_thread(
                valar_api.get_trades_multi,
                account_ids,
                tradedate
            )

            if df is None or df.empty:
                return []

            # Ensure trades are sorted by createtime descending (latest first)
            # This provides protection against external library changes
            if 'createtime' in df.columns:
                df = df.sort_values('createtime', ascending=False).reset_index(drop=True)

            trades = df.to_dict('records')

            # Process any NaN values
            for trade in trades:
                for key, value in trade.items():
                    if pd.isna(value):
                        trade[key] = None

            return trades
        except Exception as e:
            logger.error(f"Error getting multi-account trades: {e}")
            return []


# Create global service instance
valar_service = ValarService()