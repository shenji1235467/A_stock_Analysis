import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost/stock_db")
    SINA_STOCK_LIST_API = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=100&sort=symbol&asc=1&node=hs_a&symbol=&_s_r_a=init"
    SINA_STOCK_KLINE_API = lambda symbol: f"https://quotes.sina.cn/cn/api/jsonp.php/var%20_{symbol}=/KC_WS_StockService.getHsKlineData?symbol={symbol}&type=daily"
