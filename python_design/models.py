from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True)
    name = Column(String(100))
    sector = Column(String(100))
    industry = Column(String(100))
    exchange = Column(String(20))

    prices = relationship("StockPrice", back_populates="stock")

class StockPrice(Base):
    __tablename__ = "stock_prices"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    date = Column(String(20), index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)
    amount = Column(Float)

    stock = relationship("Stock", back_populates="prices")

    __table_args__ = (UniqueConstraint('stock_id', 'date', name='_stock_date_uc'),)
