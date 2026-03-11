import logging
import time
from datetime import date, datetime

import requests
import json
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from . import crud, schemas, config

def fetch_stock_list(db: Session):
    response = requests.get(config.Config.SINA_STOCK_LIST_API)
    stocks = response.json()
    stock_list = []
    for s in stocks:
        symbol = s["symbol"].upper()
        if symbol.startswith("SH"):
            exchange = "SH"
        elif symbol.startswith("SZ"):
            exchange = "SZ"
        elif symbol.startswith("BJ"):
            exchange = "BJ"
        else:
            exchange = "UN"
        stock_in = schemas.StockCreate(
            symbol=symbol,
            name=s["name"],
            sector=s.get("node"),
            industry=s.get("industry"),
            exchange=exchange
        )
        stock_list.append(stock_in)

    crud.upsert_stocks_batch(db, stock_list)
    return len(stocks)

def fetch_stock_list_all(db: Session):
    page = 1
    page_size = 100
    total = 0
    while True:
        url = (
            f"http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/"
            f"Market_Center.getHQNodeData?page={page}&num={page_size}"
            f"&sort=symbol&asc=1&node=hs_a&symbol=&_s_r_a=init"
        )
        print(url)
        response = requests.get(url, timeout=5000)
        # if response.status_code != 200:
        #     break
        stocks = response.json()
        if not stocks:
            break
        stock_list = []
        for s in stocks:
            symbol = s["symbol"].upper()
            if symbol.startswith("SH"):
                exchange = "SH"
            elif symbol.startswith("SZ"):
                exchange = "SZ"
            elif symbol.startswith("BJ"):
                exchange = "BJ"
            else:
                exchange = "UN"
            stock_in = schemas.StockCreate(
                symbol=symbol,
                name=s["name"],
                sector=s.get("node"),
                industry=s.get("industry"),
                exchange=exchange
            )
            stock_list.append(stock_in)
        crud.upsert_stocks_batch(db, stock_list)
        total += len(stocks)
        print(f"page {page} synced {len(stocks)} stocks")
        page += 1
        time.sleep(3)
    return total

def fetch_stock_prices(db: Session, symbol: str):
    stock = crud.get_stock_by_symbol(db, symbol)
    if not stock:
        return 0
    #输出 config.Config.SINA_STOCK_KLINE_API(symbol)
    print(config.Config.SINA_STOCK_KLINE_API(symbol))
    response = requests.get(config.Config.SINA_STOCK_KLINE_API(symbol))
    # Extract JSON from JSONP
    # data_str = response.text.split('=', 1)[1].rsplit(';', 1)[0]
    data = json.loads(response.text)
    
    for item in data:
        price_in = schemas.StockPriceCreate(
            stock_id=stock.id,
            date=item['day'],
            open=float(item['open']),
            high=float(item['high']),
            low=float(item['low']),
            close=float(item['close']),
            volume=int(item['volume'])
            # amount=float(item['amount'])
        )
        crud.upsert_stock_price(db, price_in)
    return len(data)

def fetch_stock_prices_batch(db: Session, symbol: str):
    stock = crud.get_stock_by_symbol(db, symbol)
    if not stock:
        return 0

    # 查询数据库最新一条价格,如果已经有当前日期的数据，不需要继续调用
    latest_price = crud.get_latest_stock_price(db, stock.id)
    if latest_price:
        today = date.today()
        latest_date = latest_price.date
        # 统一转换为 date 类型
        if isinstance(latest_date, datetime):
            latest_date = latest_date.date()
        elif isinstance(latest_date, str):
            latest_date = datetime.strptime(latest_date, "%Y-%m-%d").date()
        if latest_date == today:
            print(f"{symbol} already updated today--{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}" )
            return 0

    url = config.Config.SINA_STOCK_KLINE_API(symbol)
    print(url)
    response = requests.get(url, timeout=5000)
    data = json.loads(response.text)
    price_list = []
    for item in data:
        price_list.append(
            schemas.StockPriceCreate(
                stock_id=stock.id,
                date=item["day"],
                open=float(item["open"]),
                high=float(item["high"]),
                low=float(item["low"]),
                close=float(item["close"]),
                volume=int(item["volume"])
            )
        )
    crud.upsert_stock_prices_batch(db, price_list, batch_size=1000)
    time.sleep(3)
    return len(price_list)

def calculate_indicators(prices_df: pd.DataFrame):
    # MACD
    exp1 = prices_df['close'].ewm(span=12, adjust=False).mean()
    exp2 = prices_df['close'].ewm(span=26, adjust=False).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal
    
    # RSI
    delta = prices_df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    
    return pd.DataFrame({
        'macd': macd,
        'macd_signal': signal,
        'macd_hist': hist,
        'rsi': rsi
    })
