import db from "./database.ts";
import { Stock, StockPrice } from "./models.ts";

export const crud = {
  // Stock operations
  upsertStock(stock: Omit<Stock, "id">) {
    const stmt = db.prepare(`
      INSERT INTO stocks (symbol, name, sector, industry, exchange)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET
        name = excluded.name,
        sector = excluded.sector,
        industry = excluded.industry,
        exchange = excluded.exchange
      RETURNING id
    `);
    const result = stmt.get(stock.symbol, stock.name, stock.sector || null, stock.industry || null, stock.exchange || null) as { id: number };
    return result.id;
  },

  getStocks() {
    return db.prepare("SELECT * FROM stocks").all() as Stock[];
  },

  getStockBySymbol(symbol: string) {
    return db.prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol) as Stock | undefined;
  },

  // Stock Price operations
  upsertStockPrice(price: Omit<StockPrice, "id">) {
    const stmt = db.prepare(`
      INSERT INTO stock_prices (stock_id, date, open, high, low, close, volume, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stock_id, date) DO UPDATE SET
        open = excluded.open,
        high = excluded.high,
        low = excluded.low,
        close = excluded.close,
        volume = excluded.volume,
        amount = excluded.amount
    `);
    stmt.run(price.stock_id, price.date, price.open, price.high, price.low, price.close, price.volume, price.amount || null);
  },

  getStockPrices(stockId: number, limit: number = 100) {
    return db.prepare("SELECT * FROM stock_prices WHERE stock_id = ? ORDER BY date DESC LIMIT ?").all(stockId, limit) as StockPrice[];
  },
};
