import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import { config } from "./config.ts";

interface DbInterface {
  exec(sql: string): Promise<void>;
  get<T>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ lastInsertId?: number }>;
}

class SQLiteWrapper implements DbInterface {
  private db: Database.Database;
  constructor() {
    this.db = new Database(config.DB_PATH);
    this.db.pragma("journal_mode = WAL");
  }
  async exec(sql: string) { this.db.exec(sql); }
  async get<T>(sql: string, params: any[] = []) { return this.db.prepare(sql).get(...params) as T; }
  async all<T>(sql: string, params: any[] = []) { return this.db.prepare(sql).all(...params) as T[]; }
  async run(sql: string, params: any[] = []) {
    const result = this.db.prepare(sql).run(...params);
    return { lastInsertId: Number(result.lastInsertRowid) };
  }
}

class MySQLWrapper implements DbInterface {
  private pool: mysql.Pool;
  constructor() {
    this.pool = mysql.createPool({
      ...config.MYSQL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  async exec(sql: string) { await this.pool.query(sql); }
  async get<T>(sql: string, params: any[] = []) {
    const [rows] = await this.pool.execute(sql, params);
    return (rows as any[])[0] as T;
  }
  async all<T>(sql: string, params: any[] = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T[];
  }
  async run(sql: string, params: any[] = []) {
    const [result] = await this.pool.execute(sql, params);
    return { lastInsertId: (result as any).insertId };
  }
}

const db: DbInterface = config.USE_MYSQL ? new MySQLWrapper() : new SQLiteWrapper();

export default db;
