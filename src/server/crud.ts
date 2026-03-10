import db from "./database.ts";
import { Stock, StockPrice } from "./models.ts";
import { config } from "./config.ts";

export const crud = {
  // Stock operations
  async upsertStock(stock: Omit<Stock, "id">) {
    if (config.USE_MYSQL) {
      const sql = `
        INSERT INTO stocks (symbol, name, sector, industry, exchange)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          sector = VALUES(sector),
          industry = VALUES(industry),
          exchange = VALUES(exchange)
      `;
      await db.run(sql, [stock.symbol, stock.name, stock.sector || null, stock.industry || null, stock.exchange || null]);
      const row = await db.get<{ id: number }>("SELECT id FROM stocks WHERE symbol = ?", [stock.symbol]);
      return row?.id;
    } else {
      const sql = `
        INSERT INTO stocks (symbol, name, sector, industry, exchange)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          name = excluded.name,
          sector = excluded.sector,
          industry = excluded.industry,
          exchange = excluded.exchange
        RETURNING id
      `;
      const result = await db.get<{ id: number }>(sql, [stock.symbol, stock.name, stock.sector || null, stock.industry || null, stock.exchange || null]);
      return result?.id;
    }
  },

  async getStocks() {
    return await db.all<Stock>("SELECT * FROM stocks");
  },

  async getStockBySymbol(symbol: string) {
    return await db.get<Stock>("SELECT * FROM stocks WHERE symbol = ?", [symbol]);
  },

  // Stock Price operations
  async upsertStockPrice(price: Omit<StockPrice, "id">) {
    if (config.USE_MYSQL) {
      const sql = `
        INSERT INTO stock_prices (stock_id, date, open, high, low, close, volume, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          open = VALUES(open),
          high = VALUES(high),
          low = VALUES(low),
          close = VALUES(close),
          volume = VALUES(volume),
          amount = VALUES(amount)
      `;
      await db.run(sql, [price.stock_id, price.date, price.open, price.high, price.low, price.close, price.volume, price.amount || null]);
    } else {
      const sql = `
        INSERT INTO stock_prices (stock_id, date, open, high, low, close, volume, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(stock_id, date) DO UPDATE SET
          open = excluded.open,
          high = excluded.high,
          low = excluded.low,
          close = excluded.close,
          volume = excluded.volume,
          amount = excluded.amount
      `;
      await db.run(sql, [price.stock_id, price.date, price.open, price.high, price.low, price.close, price.volume, price.amount || null]);
    }
  },

  async getStockPrices(stockId: number, limit: number = 100) {
    return await db.all<StockPrice>("SELECT * FROM stock_prices WHERE stock_id = ? ORDER BY date DESC LIMIT ?", [stockId, limit]);
  },

  // Cleanup logic: Keep only the last 2 years of data
  async cleanupOldData() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const dateString = twoYearsAgo.toISOString().split('T')[0];
    
    await db.run("DELETE FROM stock_prices WHERE date < ?", [dateString]);
  }
};
