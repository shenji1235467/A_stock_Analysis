import dotenv from "dotenv";

dotenv.config();

const isValidUrl = (url: string | undefined) => {
  return typeof url === 'string' && url.trim().startsWith("http");
};

const DEFAULT_STOCK_LIST_API = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=100&sort=symbol&asc=1&node=hs_a&symbol=&_s_r_a=init";
const DEFAULT_KLINE_API_TEMPLATE = "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=1023";

export const config = {
  PORT: parseInt(process.env.PORT || "3000"),
  DB_PATH: (process.env.DB_PATH && !process.env.DB_PATH.includes("XXX")) ? process.env.DB_PATH : "./stocks.db",
  USE_MYSQL: process.env.USE_MYSQL === "true",
  MYSQL: {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "stocks_db",
  },
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // Free stock API endpoints (using Sina Finance as an example)
  SINA_STOCK_LIST_API: (isValidUrl(process.env.SINA_STOCK_LIST_API) ? process.env.SINA_STOCK_LIST_API! : DEFAULT_STOCK_LIST_API).trim(),
  SINA_STOCK_KLINE_API: (symbol: string) => {
    const template = (isValidUrl(process.env.SINA_STOCK_KLINE_API_TEMPLATE) ? process.env.SINA_STOCK_KLINE_API_TEMPLATE! : DEFAULT_KLINE_API_TEMPLATE).trim();
    return template.replace(/\$\{symbol\}/g, symbol);
  },
};
