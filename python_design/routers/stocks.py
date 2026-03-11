from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database, services
import time

router = APIRouter(prefix="/stocks", tags=["stocks"])

@router.get("/", response_model=List[schemas.Stock])
def read_stocks(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    stocks = crud.get_stocks(db, skip=skip, limit=limit)
    return stocks

@router.post("/sync")
def sync_stocks(db: Session = Depends(database.get_db)):
    count = services.fetch_stock_list(db)
    return {"message": f"Synced {count} stocks"}

@router.post("/syncAll")
def sync_stocks(db: Session = Depends(database.get_db)):
    count = services.fetch_stock_list_all(db)
    return {"message": f"Synced syncAll {count} stocks"}

@router.get("/{symbol}/prices", response_model=List[schemas.StockPrice])
def read_stock_prices(symbol: str, limit: int = 100, db: Session = Depends(database.get_db)):
    stock = crud.get_stock_by_symbol(db, symbol)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    prices = crud.get_stock_prices(db, stock_id=stock.id, limit=limit)
    if not prices:
        services.fetch_stock_prices(db, symbol)
        prices = crud.get_stock_prices(db, stock_id=stock.id, limit=limit)
        
    return prices

#添加一个新的路由来更新所有股票价格
@router.post("/sync/prices")
def sync_all_stock_prices(db: Session = Depends(database.get_db)):
    skip = 0
    limit = 500
    total_count = 0
    stock_count = 0
    while True:
        stocks = crud.get_stocks(db, skip=skip, limit=limit)
        if not stocks:
            break
        for stock in stocks:
            print(f"sync {stock.symbol}")
            count = services.fetch_stock_prices_batch(db, stock.symbol)
            total_count += count
            stock_count += 1
        skip += limit
    return {
        "message": f"Synced prices for {total_count} records across {stock_count} stocks"
    }