from pydantic import BaseModel
from typing import List, Optional

class StockBase(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    exchange: Optional[str] = None

class StockCreate(StockBase):
    pass

class Stock(StockBase):
    id: int

    class Config:
        from_attributes = True

class StockPriceBase(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    amount: Optional[float] = None

class StockPriceCreate(StockPriceBase):
    stock_id: int

class StockPrice(StockPriceBase):
    id: int
    stock_id: int

    class Config:
        from_attributes = True
