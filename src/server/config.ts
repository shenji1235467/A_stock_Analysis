import dotenv from "dotenv";

dotenv.config();

export const config = {
  PORT: 3000,
  DB_PATH: "./stocks.db",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // Free stock API endpoints (using Sina Finance as an example)
  SINA_STOCK_LIST_API: "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=100&sort=symbol&asc=1&node=hs_a&symbol=&_s_r_a=init",
  SINA_STOCK_KLINE_API: (symbol: string) => `https://quotes.sina.cn/cn/api/jsonp.php/var%20_${symbol}=/KC_WS_StockService.getHsKlineData?symbol=${symbol}&type=daily`,
};
