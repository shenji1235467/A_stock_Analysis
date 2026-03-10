import requests
import json
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from . import crud, schemas, config

def fetch_stock_list(db: Session):
    response = requests.get(config.Config.SINA_STOCK_LIST_API)
    stocks = response.json()
    for s in stocks:
        stock_in = schemas.StockCreate(
            symbol=s['symbol'],
            name=s['name'],
            sector=s.get('node'),
            industry=s.get('industry'),
            exchange='SH' if s['symbol'].startswith('sh') else 'SZ'
        )
        crud.upsert_stock(db, stock_in)
    return len(stocks)

def fetch_stock_prices(db: Session, symbol: str):
    stock = crud.get_stock_by_symbol(db, symbol)
    if not stock:
        return 0
    
    response = requests.get(config.Config.SINA_STOCK_KLINE_API(symbol))
    # Extract JSON from JSONP
    data_str = response.text.split('=', 1)[1].rsplit(';', 1)[0]
    data = json.loads(data_str)
    
    for item in data:
        price_in = schemas.StockPriceCreate(
            stock_id=stock.id,
            date=item['day'],
            open=float(item['open']),
            high=float(item['high']),
            low=float(item['low']),
            close=float(item['close']),
            volume=int(item['volume']),
            amount=float(item['amount'])
        )
        crud.upsert_stock_price(db, price_in)
    return len(data)

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
