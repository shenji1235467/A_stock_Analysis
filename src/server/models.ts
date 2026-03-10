import db from "./database.ts";
import { config } from "./config.ts";

export async function initDb() {
  const isMySQL = config.USE_MYSQL;
  const autoIncrement = isMySQL ? "AUTO_INCREMENT" : "AUTOINCREMENT";
  const textType = isMySQL ? "VARCHAR(255)" : "TEXT";

  // Stock table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY ${autoIncrement},
      symbol ${isMySQL ? "VARCHAR(20)" : "TEXT"} UNIQUE NOT NULL,
      name ${textType} NOT NULL,
      sector ${textType},
      industry ${textType},
      exchange ${textType}
    )
  `);

  // Stock Price table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS stock_prices (
      id INTEGER PRIMARY KEY ${autoIncrement},
      stock_id INTEGER NOT NULL,
      date ${isMySQL ? "VARCHAR(20)" : "TEXT"} NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume ${isMySQL ? "BIGINT" : "INTEGER"} NOT NULL,
      amount REAL,
      FOREIGN KEY (stock_id) REFERENCES stocks (id),
      UNIQUE(stock_id, date)
    )
  `);
}

export interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  exchange?: string;
}

export interface StockPrice {
  id: number;
  stock_id: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}
