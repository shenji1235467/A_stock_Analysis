from sqlalchemy.orm import Session
from . import models, schemas

def get_stocks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Stock).offset(skip).limit(limit).all()

def get_stock_by_symbol(db: Session, symbol: str):
    return db.query(models.Stock).filter(models.Stock.symbol == symbol).first()

def create_stock(db: Session, stock: schemas.StockCreate):
    db_stock = models.Stock(**stock.dict())
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return db_stock

def upsert_stock(db: Session, stock: schemas.StockCreate):
    db_stock = get_stock_by_symbol(db, stock.symbol)
    if db_stock:
        for key, value in stock.dict().items():
            setattr(db_stock, key, value)
    else:
        db_stock = models.Stock(**stock.dict())
        db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return db_stock

def get_stock_prices(db: Session, stock_id: int, limit: int = 100):
    return db.query(models.StockPrice).filter(models.StockPrice.stock_id == stock_id).order_by(models.StockPrice.date.desc()).limit(limit).all()

def upsert_stock_price(db: Session, price: schemas.StockPriceCreate):
    db_price = db.query(models.StockPrice).filter(
        models.StockPrice.stock_id == price.stock_id,
        models.StockPrice.date == price.date
    ).first()
    if db_price:
        for key, value in price.dict().items():
            setattr(db_price, key, value)
    else:
        db_price = models.StockPrice(**price.dict())
        db.add(db_price)
    db.commit()
    return db_price
