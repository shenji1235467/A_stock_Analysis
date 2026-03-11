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

def upsert_stocks_batch(db: Session, stocks: list[schemas.StockCreate]):
    symbols = [s.symbol for s in stocks]
    # 一次查询已有股票
    existing = db.query(models.Stock).filter(models.Stock.symbol.in_(symbols)).all()
    existing_map = {s.symbol: s for s in existing}
    insert_list = []
    update_list = []
    for stock in stocks:
        if stock.symbol in existing_map:
            db_stock = existing_map[stock.symbol]
            for key, value in stock.dict().items():
                setattr(db_stock, key, value)
            update_list.append(db_stock)
        else:
            insert_list.append(models.Stock(**stock.dict()))
    if insert_list:
        db.bulk_save_objects(insert_list)
    db.commit()
    return len(insert_list), len(update_list)

def get_stock_prices(db: Session, stock_id: int, limit: int = 100):
    return db.query(models.StockPrice).filter(models.StockPrice.stock_id == stock_id).order_by(models.StockPrice.date.desc()).limit(limit).all()

def get_latest_stock_price(db: Session, stock_id: int):
    return (
        db.query(models.StockPrice)
        .filter(models.StockPrice.stock_id == stock_id)
        .order_by(models.StockPrice.date.desc())
        .first()
    )

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


def upsert_stock_prices_batch(db: Session, prices: list[schemas.StockPriceCreate], batch_size: int = 1000):
    for i in range(0, len(prices), batch_size):
        batch = prices[i:i + batch_size]
        stock_id = batch[0].stock_id
        dates = [p.date for p in batch]
        existing = db.query(models.StockPrice).filter(
            models.StockPrice.stock_id == stock_id,
            models.StockPrice.date.in_(dates)
        ).all()
        existing_map = {(e.stock_id, e.date): e for e in existing}
        insert_list = []
        for p in batch:
            key = (p.stock_id, p.date)
            if key in existing_map:
                db_price = existing_map[key]
                for k, v in p.dict().items():
                    setattr(db_price, k, v)
            else:
                insert_list.append(models.StockPrice(**p.dict()))
        if insert_list:
            db.bulk_save_objects(insert_list)
        db.commit()