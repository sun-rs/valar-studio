from typing import Dict
import pymongo
import datetime as dt
import valar as va
from valar.dependencies import pandas as pd


def get_mongo_client() -> pymongo.MongoClient:
    """
    获取MongoDB客户端.
    """
    return va.get_mongo_client("CLOUD")

def get_positions_single(accountid: str) -> pd.DataFrame:
    """
    获取单个账户的持仓信息.
    """
    return va.get_realtime_pos(accountid, "CLOUD")

def get_positions_multi(accounts: list[str]) -> pd.DataFrame | None:
    """
    获取多个账户的持仓信息.
    """
    client = get_mongo_client()
    cursor_pos = client["position"].find({"accountid":{"$in":accounts},"volume":{"$gt":0}}) #取pos vol>0
    pos = pd.DataFrame([item for item in cursor_pos])

    #Position
    if len(pos):
        pos_new = []
        for _, grp in pos.groupby("local_position_id"):
            pos_new.append({
                "code":grp["symbol"].values[0],\
                "exchange":grp["exchange"].values[0],
                "dir":grp["direction"].values[0],
                "float_pnl":int(grp["float_pnl"].sum()),
                "last":round(grp["current_price"].values[0],2),
                "open_price":round((grp["open_price"]*grp["volume"]).sum()/grp["volume"].sum(),2),
                "volume":grp["volume"].sum(),
                "yd_vol":grp["yd_volume"].sum(),
                "pnl":round(grp["pnl"].sum(),2),
                "frozen":grp["frozen"].sum(),
                "updatetime":min(grp["updatetime"])
                })

        pos = pd.DataFrame(pos_new)
        pos = pos[pos["code"].apply(lambda x: "SPC" not in x)] # 剔除DCE SPC合约
        pos["symbol_upper"] = pos["code"].apply(va.to_symbol)
        pos.sort_values(by=["symbol_upper","dir"], inplace=True)

        preset = va.MarketPreset()
        pos["margin"] = ((pos["symbol_upper"].apply(lambda x: preset[x]["margin"] * preset[x]["size"]) \
                * pos["open_price"] * pos["volume"])).apply(lambda x: format(x,".2"))
                
        pos = pos.loc[:, ["code","exchange","dir","float_pnl","margin","last","open_price",\
            "volume","yd_vol","pnl","frozen","updatetime"]]

        return pos.reset_index(drop=True)
    else:
        return None

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
    float_pnl = pos.groupby("accountid").apply(lambda x:int(x.float_pnl.sum())).to_dict()
    acc["float_pnl"] = acc["accountid"].apply(lambda x: float_pnl[x])
    acc["margin%"] = (acc["margin"]/acc["balance"]).apply(lambda x: format(x, ".0%"))
    acc["init_cash"] = acc["accountid"].apply(lambda x: accounts[x])
    acc["total_pnl"] = acc["balance"] - acc["init_cash"]
    acc = acc.loc[:,["accountid","balance","float_pnl","total_pnl","margin","margin%","available","init_cash","frozen","updatetime"]]
    acc["rank"] = acc["accountid"].apply(list(accounts.keys()).index)
    return acc.sort_values("rank")

def get_special_orders(accounts: str | list[str]) -> pd.DataFrame | None:
    """返回多个账户的特殊状态的订单("提交中","未成交","部分成交","已撤销","拒单")."""
    accounts = [accounts] if isinstance(accounts, str) else accounts
    client = get_mongo_client()

    tradedate = dt.date.today().isoformat()
    if dt.datetime.now().time() < dt.time(19, 30 ,0): # 七点半之前依然显示当日白天这个交易日的数据, 默认没完成结算
        query_mark = 'gte'
    else:
        query_mark = 'gt'

    #提取特殊状态订单
    cursor = client["order"].find({
        "accountid":{"$in":accounts},
        "status":{"$in":["提交中","未成交","部分成交","已撤销","拒单"]},
        "tradedate":{f"${query_mark}":tradedate}})
    order = pd.DataFrame([item for item in cursor])
    if len(order):
        order["code"] = order["symbol"]
        order.sort_values(by=["createtime"], ascending=False, inplace=True)
        headers_order = ["accountid","code","exchange","direction","offset","price","volume","order_id","type","traded","status","createtime","updatetime"]
        order = order[headers_order]
        return order
    else:
        return None

def get_orders(accountid: str, is_special: bool = False) -> pd.DataFrame | None:
    """
    返回某账户的所有订单.
    
    Parameters
    ----------
    accountid
        账户ID.
    is_special
        True  -> 只返回特殊状态的订单("提交中","未成交","部分成交","已撤销","拒单").
        False -> 返回所有"全部成交"状态的订单.
    """
    tradedate = dt.date.today().isoformat()
    if dt.datetime.now().time() < dt.time(19, 30 ,0): # 七点半之前依然显示当日白天这个交易日的数据, 默认没完成结算
        query_mark = 'gte'
    else:
        query_mark = 'gt'

    client = get_mongo_client()
    if is_special:
        status = {"$in":["提交中","未成交","部分成交","已撤销","拒单"]}
    else:
        status = "全部成交"
    
    cursor = client["order"].find({"accountid":accountid,"status":status,"tradedate":{f"${query_mark}":tradedate}})
    order_ctp = pd.DataFrame([item for item in cursor])
    
    if len(order_ctp):
        order_ctp = order_ctp.sort_values(by=["createtime"], ascending=False)
        headers_order = ["code","exchange","direction","offset","price","volume","order_id","type","traded","status","createtime","updatetime"]
        order_ctp["code"] = order_ctp["symbol"]
        order_ctp = order_ctp[headers_order]
        return order_ctp
    else:
        return None

def get_trades(accountid: str) -> pd.DataFrame | None:
    """
    返回某账户的所有订单.
    
    Parameters
    ----------
    accountid
        账户ID.
    """
    tradedate = dt.date.today().isoformat()
    if dt.datetime.now().time() < dt.time(19, 30 ,0): # 七点半之前依然显示当日白天这个交易日的数据, 默认没完成结算
        query_mark = 'gte'
    else:
        query_mark = 'gt'

    client = get_mongo_client()
    cursor = client["trade"].find({"accountid":accountid,"tradedate":{f"${query_mark}":tradedate}})
    trade_ctp = pd.DataFrame([item for item in cursor])
    if len(trade_ctp):
        trade_ctp = trade_ctp.sort_values(by=["createtime"], ascending=False)
        headers_trade = ["code","exchange","direction","offset","price","volume","order_id","tradeid","createtime"]
        trade_ctp["code"] = trade_ctp["symbol"]
        trade_ctp = trade_ctp[headers_trade]
        return trade_ctp
    else:
        return None

def get_account_his(accountid: str, start_date: dt.date | None = None) -> list:
    """
    返回某账户的资金历史, 从指定日期开始.
    
    Parameters
    ----------
    accountid
        账户ID.
    strat_date
        开始日期, 默认是当天.
    """
    client = get_mongo_client()
    start_date = va.tradedate_safe() if start_date is None else start_date
    start = dt.datetime.combine(start_date, dt.time(15,15,0)).isoformat(sep=" ")

    cursor = client.account_his.find({
        "accountid": accountid,
        "updatetime": {"$gte": start}
    })

    return list(cursor)