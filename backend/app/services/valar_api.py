from typing import Dict
import pymongo
import datetime as dt
import os
import valar as va
from valar.dependencies import pandas as pd
from valar.dependencies import polars as pl


def get_mongo_client() -> pymongo.MongoClient:
    """
    获取MongoDB客户端.
    """
    connection_name = os.getenv("VALAR_MONGO_CONNECTION", "VALAR")
    return va.get_mongo_client(connection_name)

def get_positions(accounts: str | list[str]) -> pd.DataFrame:
    """
    获取账户的持仓信息.
    """
    connection_name = os.getenv("VALAR_MONGO_CONNECTION", "VALAR")
    return va.get_realtime_pos(accounts=accounts, agg=True, profile=connection_name)

def get_accounts(accounts: Dict[str, int | float]) -> pd.DataFrame:
    """
    获取所有账户的信息.

    Parameters
    ----------
    accounts
        账户字典,键为账户ID,值为初始资金.
    """
    client = get_mongo_client()
    cursor_acc = client["account"].find({"accountid":{"$in":list(accounts.keys())}}) 
    acc = pd.DataFrame([item for item in cursor_acc])

    cursor_pos = client["position"].find({"accountid":{"$in":list(accounts.keys())},"volume":{"$gt":0}}) #取pos vol>0
    pos = pd.DataFrame([item for item in cursor_pos])

    # Handle accounts with no positions
    if len(pos) > 0:
        float_pnl = pos.groupby("accountid").apply(lambda x:int(x.float_pnl.sum())).to_dict()
    else:
        float_pnl = {}

    # Use .get() to handle accounts without positions (default to 0)
    acc["float_pnl"] = acc["accountid"].apply(lambda x: float_pnl.get(x, 0))
    acc["margin%"] = (acc["margin"]/acc["balance"]).apply(lambda x: format(x, ".0%"))
    acc["init_cash"] = acc["accountid"].apply(lambda x: accounts[x])
    acc["total_pnl"] = acc["balance"] - acc["init_cash"]
    acc = acc.loc[:,["accountid","balance","float_pnl","total_pnl","margin","margin%","available","init_cash","frozen","updatetime"]]
    acc["rank"] = acc["accountid"].apply(list(accounts.keys()).index)
    return acc.sort_values("rank")

def get_special_orders(accounts: str | list[str], tradedate: str | dt.date | None = None) -> pd.DataFrame | None:
    """返回多个账户的特殊状态的订单("提交中","未成交","部分成交","已撤销","拒单")."""
    if tradedate is None:
        tradedate = va.tradedate_now().isoformat()
    elif isinstance(tradedate, dt.date):
        tradedate = tradedate.isoformat()
    else:
        pass # Assume it's already a string

    accounts = [accounts] if isinstance(accounts, str) else accounts
    client = get_mongo_client()

    #提取特殊状态订单
    cursor = client["order"].find({
        "accountid":{"$in":accounts},
        "status":{"$in":["提交中","未成交","部分成交","已撤销","拒单"]},
        "tradedate":tradedate})
    order = pd.DataFrame([item for item in cursor])
    if len(order):
        order["code"] = order["symbol"]
        order.sort_values(by=["createtime"], ascending=False, inplace=True)
        headers_order = ["accountid","code","exchange","direction","offset","price","volume","order_id","type","traded","status","createtime","updatetime"]
        order = order[headers_order]

        # Map Chinese direction to English for frontend compatibility
        direction_map = {
            "多": "long",
            "空": "short",
            "long": "long",
            "short": "short",
            "买": "long",
            "卖": "short"
        }
        order['direction'] = order['direction'].map(direction_map).fillna(order['direction'])

        return order
    else:
        return None

def get_orders(accountid: str, tradedate: str | dt.date | None = None, is_special: bool = False) -> pd.DataFrame | None:
    """
    返回某账户的所有订单.
    
    Parameters
    ----------
    accountid
        账户ID.
    tradedate
        交易日期, 默认是当天.
    is_special
        True  -> 只返回特殊状态的订单("提交中","未成交","部分成交","已撤销","拒单").
        False -> 返回所有"全部成交"状态的订单.
    """
    if tradedate is None:
        tradedate = va.tradedate_now().isoformat()
    elif isinstance(tradedate, dt.date):
        tradedate = tradedate.isoformat()
    else:
        pass # Assume it's already a string

    client = get_mongo_client()
    if is_special:
        status = {"$in":["提交中","未成交","部分成交","已撤销","拒单"]}
    else:
        status = "全部成交"
    
    cursor = client["order"].find({"accountid":accountid,"status":status,"tradedate":tradedate})
    order_ctp = pd.DataFrame([item for item in cursor])
    
    if len(order_ctp):
        order_ctp = order_ctp.sort_values(by=["updatetime"], ascending=False)
        headers_order = ["accountid","code","exchange","direction","offset","price","volume","order_id","type","traded","status","createtime","updatetime"]
        order_ctp["code"] = order_ctp["symbol"]
        order_ctp = order_ctp[headers_order]

        # Map Chinese direction to English for frontend compatibility
        direction_map = {
            "多": "long",
            "空": "short",
            "long": "long",
            "short": "short",
            "买": "long",
            "卖": "short"
        }
        order_ctp['direction'] = order_ctp['direction'].map(direction_map).fillna(order_ctp['direction'])

        return order_ctp
    else:
        return None

def get_trades(accountid: str, tradedate: str | dt.date | None = None) -> pd.DataFrame | None:
    """
    返回某账户的所有订单.

    Parameters
    ----------
    accountid
        账户ID.
    tradedate
        交易日期. 如果为None, 默认使用今日.
    """
    if tradedate is None:
        tradedate = va.tradedate_now().isoformat()
    elif isinstance(tradedate, dt.date):
        tradedate = tradedate.isoformat()
    else:
        pass  # Assume it's already a string

    client = get_mongo_client()
    cursor = client["trade"].find({"accountid":accountid,"tradedate":tradedate})
    trade_ctp = pd.DataFrame([item for item in cursor])
    if len(trade_ctp):
        trade_ctp = trade_ctp.sort_values(by=["createtime"], ascending=False)
        headers_trade = ["accountid","code","exchange","direction","offset","price","volume","order_id","tradeid","createtime"]
        trade_ctp["code"] = trade_ctp["symbol"]
        trade_ctp = trade_ctp[headers_trade]

        # Map Chinese direction to English for frontend compatibility
        direction_map = {
            "多": "long",
            "空": "short",
            "long": "long",
            "short": "short",
            "买": "long",
            "卖": "short"
        }
        trade_ctp['direction'] = trade_ctp['direction'].map(direction_map).fillna(trade_ctp['direction'])

        return trade_ctp
    else:
        return None

# def get_account_his(accountid: str, start_date: dt.date | None = None) -> list:
#     """
#     返回某账户的资金历史, 从指定日期开始.
    
#     Parameters
#     ----------
#     accountid
#         账户ID.
#     strat_date
#         开始日期, 默认是当天.
#     """
#     client = get_mongo_client()
#     start_date = va.tradedate_safe() if start_date is None else start_date
#     start = dt.datetime.combine(start_date, dt.time(15,15,0)).isoformat(sep=" ")

#     cursor = client.account_his.find({
#         "accountid": accountid,
#         "updatetime": {"$gte": start}
#     })

#     return list(cursor)

def get_account_his(accountid: str, days: int = 5, start_date: dt.date | None = None) -> pd.DataFrame:
    """
    返回某账户的资金历史, 从指定日期开始.
    
    Parameters
    ----------
    accountid
        账户ID.
    days
        返回多少天的历史, 默认5天, 当start_date不为None时忽略此参数.
    strat_date
        开始日期, 默认是当天.
    """
    client = get_mongo_client()
    if start_date is None:
        start_date = va.get_shifted_tradedate(va.tradedate_now(), days)

    start = dt.datetime.combine(start_date, dt.time(15,15,0)).isoformat(sep=" ")

    cursor = client.account_his.find({
        "accountid": accountid,
        "updatetime": {"$gte": start}
    })

    # 转换为列表以检查是否为空
    cursor_list = list(cursor)

    # 如果没有数据，返回空的DataFrame
    if not cursor_list:
        return pd.DataFrame(columns=["accountid", "balance"]).set_index(pd.DatetimeIndex([], name="updatetime"))

    data = pl.DataFrame(cursor_list).with_columns([
        pl.col("updatetime").str.strptime(pl.Datetime, format="%Y-%m-%d %H:%M:%S"),
        pl.col("updatetime").str.strptime(pl.Datetime, format="%Y-%m-%d %H:%M:%S").dt.time().alias("time")
    ]).filter(
        # 夜盘：21:00-23:59 或 00:00-02:30
        (pl.col("time") >= dt.time(21,0)) |
        (pl.col("time") <= dt.time(2,30)) |
        # 上午：09:00-11:30
        ((pl.col("time") >= dt.time(9,0)) & (pl.col("time") <= dt.time(11,30))) |
        # 下午：13:00-15:15
        ((pl.col("time") >= dt.time(13,0)) & (pl.col("time") <= dt.time(15,15)))
    ).select(["accountid", "updatetime", "balance"]).to_pandas().set_index("updatetime")

    return data

def get_orders_multi(accounts: list[str], tradedate: str | dt.date | None = None, is_special: bool | None = None) -> pd.DataFrame | None:
    """
    获取多个账户的订单信息.
    """
    if tradedate is None:
        tradedate = va.tradedate_now().isoformat()
    elif isinstance(tradedate, dt.date):
        tradedate = tradedate.isoformat()
    else:
        pass # Assume it's already a string

    client = get_mongo_client()

    _filter = {"accountid":{"$in":accounts},"tradedate":tradedate}
    if is_special is not None:
        if is_special:
            _filter["status"] = {"$in":["提交中","未成交","部分成交","已撤销","拒单"]}
        else:
            _filter["status"] = "全部成交"

    cursor = client["order"].find(_filter)
    order_ctp = pd.DataFrame([item for item in cursor])

    if len(order_ctp):
        order_ctp = order_ctp.sort_values(by=["updatetime"], ascending=False)
        headers_order = ["accountid","code","exchange","direction","offset","price","volume","order_id","type","traded","status","createtime","updatetime"]
        order_ctp["code"] = order_ctp["symbol"]
        order_ctp = order_ctp[headers_order]

        # Map Chinese direction to English for frontend compatibility
        direction_map = {
            "多": "long",
            "空": "short",
            "long": "long",
            "short": "short",
            "买": "long",
            "卖": "short"
        }
        order_ctp['direction'] = order_ctp['direction'].map(direction_map).fillna(order_ctp['direction'])

        return order_ctp
    else:
        return None

def get_trades_multi(accounts: list[str], tradedate: str | dt.date | None = None) -> pd.DataFrame | None:
    """
    获取多个账户的成交信息.
    """
    if tradedate is None:
        tradedate = va.tradedate_now().isoformat()
    elif isinstance(tradedate, dt.date):
        tradedate = tradedate.isoformat()
    else:
        pass # Assume it's already a string

    client = get_mongo_client()
    cursor = client["trade"].find({"accountid":{"$in":accounts},"tradedate":tradedate})
    trade_ctp = pd.DataFrame([item for item in cursor])
    if len(trade_ctp):
        trade_ctp = trade_ctp.sort_values(by=["createtime"], ascending=False)
        headers_trade = ["accountid","code","exchange","direction","offset","price","volume","order_id","tradeid","createtime"]
        trade_ctp["code"] = trade_ctp["symbol"]
        trade_ctp = trade_ctp[headers_trade]

        # Map Chinese direction to English for frontend compatibility
        direction_map = {
            "多": "long",
            "空": "short",
            "long": "long",
            "short": "short",
            "买": "long",
            "卖": "short"
        }
        trade_ctp['direction'] = trade_ctp['direction'].map(direction_map).fillna(trade_ctp['direction'])

        return trade_ctp
    else:
        return None