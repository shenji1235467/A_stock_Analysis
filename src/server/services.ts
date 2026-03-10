import axios from "axios";
import { crud } from "./crud.ts";
import { config } from "./config.ts";

export const services = {
  // Fetch stock list from Sina Finance
  async fetchStockList() {
    try {
      const response = await axios.get(config.SINA_STOCK_LIST_API);
      const stocks = response.data;
      for (const stock of stocks) {
        let exchange = "SZ";
        if (stock.symbol.startsWith("sh")) exchange = "SH";
        else if (stock.symbol.startsWith("bj")) exchange = "BJ";

        crud.upsertStock({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.node,
          industry: stock.industry,
          exchange: exchange,
        });
      }
      return { success: true, count: stocks.length };
    } catch (error) {
      console.error("Error fetching stock list:", error);
      throw error;
    }
  },

  // Fetch historical prices (K-line data)
  async fetchStockPrices(symbol: string) {
    try {
      const stock = crud.getStockBySymbol(symbol);
      if (!stock) throw new Error(`Stock with symbol ${symbol} not found`);

      const response = await axios.get(config.SINA_STOCK_KLINE_API(symbol), {
        responseType: 'text'
      });
      
      const rawData = response.data;
      if (typeof rawData !== 'string' || rawData.includes('/*<script>')) {
        console.warn(`Unexpected response format for ${symbol}:`, rawData.substring(0, 100));
        return { success: false, count: 0, message: "Invalid data format from provider" };
      }

      // Sina Finance returns JSONP, e.g., var _sh600000=[{...},{...}];
      // or an error object: var _bj920000=({"__ERROR":3,"__ERRORMSG":"Service not available"});
      const dataPart = rawData.split('=', 2)[1]?.replace(/;$/, "");
      if (!dataPart) {
        console.warn(`Could not parse data part from response for ${symbol}`);
        return { success: false, count: 0, message: "Parse error" };
      }

      let data;
      try {
        // Remove surrounding parentheses if present (some JSONP formats use them)
        const cleanData = dataPart.trim().replace(/^\(/, "").replace(/\)$/, "");
        data = JSON.parse(cleanData);
      } catch (e) {
        console.warn(`JSON parse failed for ${symbol}:`, dataPart.substring(0, 100));
        return { success: false, count: 0, message: "Invalid JSON" };
      }

      if (data && data.__ERROR) {
        console.warn(`API Error for ${symbol}: ${data.__ERRORMSG}`);
        return { success: false, count: 0, message: data.__ERRORMSG || "API Error" };
      }

      if (!Array.isArray(data)) {
        console.warn(`Expected array for ${symbol}, got:`, typeof data);
        return { success: false, count: 0, message: "Unexpected data structure" };
      }

      for (const item of data) {
        crud.upsertStockPrice({
          stock_id: stock.id,
          date: item.day,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseInt(item.volume),
          amount: parseFloat(item.amount),
        });
      }
      return { success: true, count: data.length };
    } catch (error) {
      console.error(`Error fetching prices for ${symbol}:`, error);
      throw error;
    }
  },

  // Calculate MACD
  calculateMACD(prices: number[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9) {
    const emaShort = this.calculateEMA(prices, shortPeriod);
    const emaLong = this.calculateEMA(prices, longPeriod);
    const diff = emaShort.map((val, i) => val - emaLong[i]);
    const dea = this.calculateEMA(diff, signalPeriod);
    const macd = diff.map((val, i) => (val - dea[i]) * 2);
    return { diff, dea, macd };
  },

  // Calculate RSI
  calculateRSI(prices: number[], period: number = 14) {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;

      if (i >= period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));

        // Update gains/losses for next iteration (simple moving average)
        const prevDiff = prices[i - period + 1] - prices[i - period];
        if (prevDiff > 0) gains -= prevDiff;
        else losses += prevDiff;
      } else {
        rsi.push(NaN);
      }
    }
    return rsi;
  },

  calculateEMA(prices: number[], period: number) {
    const ema: number[] = [];
    const k = 2 / (period + 1);
    let currentEma = prices[0];
    ema.push(currentEma);

    for (let i = 1; i < prices.length; i++) {
      currentEma = prices[i] * k + currentEma * (1 - k);
      ema.push(currentEma);
    }
    return ema;
  },
};
