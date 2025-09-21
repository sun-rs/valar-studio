> VALAR
authenticated
The aggregate query will be run with Query Assist.

The aggregate query will be run with Query Assist.

开始扫描 6 个集合...
  ✓ order ... 结构分析完成
  ✓ position ... 结构分析完成
  ✓ contract ... 结构分析完成
  ✓ account ... 结构分析完成
  ✓ trade ... 结构分析完成
  ✓ account_his ... 结构分析完成
所有集合扫描完毕！
{
  "order": {
    "accountid": "string",
    "order_id": "string",
    "createtime": "string",
    "direction": "string",
    "exchange": "string",
    "gateway_name": "string",
    "is_local": "bool",
    "local_order_id": "string",
    "local_symbol": "string",
    "offset": "string",
    "price": "double",
    "status": "string",
    "symbol": "string",
    "time": "string",
    "traded": "int",
    "tradedate": "string",
    "type": "string",
    "updatetime": "string",
    "volume": "int"
  },
  "position": {
    "local_position_id": "string",
    "accountid": "string",
    "current_price": "int",
    "direction": "string",
    "exchange": "string",
    "float_pnl": "int",
    "frozen": "int",
    "gateway_name": "string",
    "local_symbol": "string",
    "open_price": "int",
    "pnl": "double",
    "price": "int",
    "symbol": "string",
    "updatetime": "string",
    "volume": "int",
    "yd_volume": "int"
  },
  "contract": {
    "code": "string",
    "__name__": "string",
    "combination_type": "string",
    "create_date": "string",
    "delivery_month": "int",
    "delivery_year": "int",
    "end_delivery_date": "string",
    "exchange": "string",
    "gateway_name": "string",
    "is_trading": "bool",
    "local_symbol": "string",
    "long_margin_ratio": "double",
    "max_limit_order_volume": "int",
    "max_market_order_volume": "int",
    "min_limit_order_volume": "int",
    "min_market_order_volume": "int",
    "name": "string",
    "open_date": "string",
    "pricetick": "double",
    "product": "string",
    "short_margin_ratio": "double",
    "size": "int",
    "start_delivery_date": "string",
    "symbol": "string",
    "trading_code": "string",
    "update_date": "string"
  },
  "account": {
    "accountid": "string",
    "available": "double",
    "balance": "double",
    "frozen": "double",
    "gateway_name": "string",
    "local_account_id": "string",
    "margin": "double",
    "updatetime": "string"
  },
  "trade": {
    "accountid": "string",
    "tradeid": "string",
    "tradedate": "string",
    "createtime": "string",
    "direction": "string",
    "exchange": "string",
    "gateway_name": "string",
    "is_local": "bool",
    "local_order_id": "string",
    "local_symbol": "string",
    "local_trade_id": "string",
    "offset": "string",
    "order_id": "string",
    "order_time": "string",
    "price": "double",
    "symbol": "string",
    "time": "string",
    "volume": "int"
  },
  "account_his": {
    "accountid": "string",
    "updatetime": "string",
    "available": "double",
    "balance": "double",
    "frozen": "double",
    "gateway_name": "string",
    "local_account_id": "string",
    "margin": "double"
  }
}