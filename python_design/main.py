from fastapi import FastAPI
from .routers import stocks
from .database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Stock Analysis API")

app.include_router(stocks.router)

@app.get("/")
def root():
    return {"message": "Welcome to Stock Analysis API"}
