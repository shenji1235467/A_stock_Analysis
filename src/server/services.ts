import axios from "axios";
import { crud } from "./crud.ts";
import { config } from "./config.ts";

export const services = {
  // Fetch stock list from Sina Finance (with pagination to get all stocks)
  async fetchStockList() {
    console.log(`Starting full stock list sync...`);

    // Run the actual sync in the background to avoid timeouts
    this.runBackgroundSync(1, 100);

    return { success: true, message: "Sync started in background" };
  },

  async runBackgroundSync(startPage: number, num: number) {
    let page = startPage;
    let totalSynced = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        const url = `https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=${page}&num=${num}&sort=symbol&asc=1&node=hs_a&symbol=&_s_r_a=init`;
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'Referer': 'https://finance.sina.com.cn/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          responseType: 'text'
        });
        
        let rawData = response.data;
        if (typeof rawData !== 'string') {
          rawData = JSON.stringify(rawData);
        }

        if (rawData.trim() === "null" || rawData.trim() === "[]") {
          hasMore = false;
          break;
        }

        let stocks;
        try {
          stocks = JSON.parse(rawData);
        } catch (e) {
          try {
            const fixedData = rawData.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            stocks = JSON.parse(fixedData);
          } catch (e2) {
            console.error(`Failed to parse stock list data at page ${page}`);
            hasMore = false;
            break;
          }
        }

        if (!Array.isArray(stocks) || stocks.length === 0) {
          hasMore = false;
          break;
        }

        for (const stock of stocks) {
          let exchange = "SZ";
          if (stock.symbol.startsWith("sh")) exchange = "SH";
          else if (stock.symbol.startsWith("bj")) exchange = "BJ";

          await crud.upsertStock({
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.node,
            industry: stock.industry,
            exchange: exchange,
          });
        }

        totalSynced += stocks.length;
        console.log(`Synced page ${page}, total: ${totalSynced}`);
        
        if (stocks.length < num) {
          hasMore = false;
        } else {
          page++;
          // Add a small delay to avoid being blocked
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      console.log(`Background sync completed. Total stocks: ${totalSynced}`);
    } catch (error) {
      console.error("Error in background stock list sync:", error);
    }
  },

  // Sync specific stocks by symbols
  async syncStocksBySymbols(symbols: string[]) {
    console.log(`Starting bulk sync for symbols: ${symbols.join(", ")}`);
    const results = [];

    for (const symbol of symbols) {
      try {
        // 1. Ensure stock exists in 'stocks' table
        let stock = await crud.getStockBySymbol(symbol);
        if (!stock) {
          // If not in DB, we try to fetch basic info. 
          try {
            const hqUrl = `https://hq.sinajs.cn/list=${symbol}`;
            const hqRes = await axios.get(hqUrl, { 
              responseType: 'arraybuffer',
              headers: { 'Referer': 'https://finance.sina.com.cn/' }
            });
            // Sina HQ returns GBK encoding
            const decoder = new TextDecoder('gbk');
            const hqData = decoder.decode(hqRes.data);
            const match = hqData.match(/="(.*)"/);
            if (match && match[1]) {
              const parts = match[1].split(',');
              if (parts.length > 0 && parts[0] !== "") {
                await crud.upsertStock({
                  symbol,
                  name: parts[0],
                  exchange: symbol.startsWith("sh") ? "SH" : (symbol.startsWith("sz") ? "SZ" : "BJ")
                });
                stock = await crud.getStockBySymbol(symbol);
              }
            }
          } catch (e) {
            console.error(`Failed to fetch basic info for ${symbol}`, e);
          }
        }

        if (stock) {
          // 2. Fetch prices
          const priceResult = await this.fetchStockPrices(symbol);
          results.push({ symbol, success: true, count: priceResult.count });
        } else {
          results.push({ symbol, success: false, message: "Could not find stock info" });
        }
      } catch (error) {
        console.error(`Error syncing ${symbol}:`, error);
        results.push({ symbol, success: false, error: String(error) });
      }
      // Small delay between stocks
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  },

  // Fetch historical prices (K-line data)
  async fetchStockPrices(symbol: string) {
    const url = config.SINA_STOCK_KLINE_API(symbol);
    console.log(`Fetching prices for ${symbol} from: ${url}`);
    try {
      const stock = await crud.getStockBySymbol(symbol);
      if (!stock) throw new Error(`Stock with symbol ${symbol} not found`);

      if (!url || !url.startsWith('http')) {
        throw new TypeError(`Invalid URL: ${url}`);
      }

      const response = await axios.get(url, {
        responseType: 'text',
        headers: {
          'Referer': 'http://finance.sina.com.cn/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const rawData = response.data;
      if (typeof rawData !== 'string') {
        console.warn(`Unexpected response type for ${symbol}:`, typeof rawData);
        return { success: false, count: 0, message: "Invalid data type from provider" };
      }

      // Handle Sina Finance response formats:
      // 1. JSONP: var _sh600000=[{...},{...}];
      // 2. Pure JSON (with unquoted keys): [{day:"...",...}]
      // 3. Error object: var _bj920000=({"__ERROR":3,...});
      
      let dataPart = rawData.trim();
      
      // Remove potential script wrappers or comments like /*<script>... */
      if (dataPart.startsWith('/*')) {
        dataPart = dataPart.replace(/^\/\*[\s\S]*?\*\//, "").trim();
      }
      if (dataPart.includes('</script>')) {
        dataPart = dataPart.replace(/<script[\s\S]*?<\/script>/gi, "").trim();
        // Also handle the trailing */ if it was part of a comment
        dataPart = dataPart.replace(/\*\/$/, "").trim();
      }

      if (dataPart.includes('=')) {
        dataPart = dataPart.split('=', 2)[1].replace(/;$/, "");
      }
      
      if (!dataPart) {
        console.warn(`Could not parse data part from response for ${symbol}`);
        return { success: false, count: 0, message: "Parse error" };
      }

      let data;
      try {
        // Remove surrounding parentheses if present
        const cleanData = dataPart.trim().replace(/^\(/, "").replace(/\)$/, "");
        try {
          data = JSON.parse(cleanData);
        } catch (e) {
          // Try to fix unquoted keys (common in Sina APIs)
          const fixedData = cleanData.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          data = JSON.parse(fixedData);
        }
      } catch (e) {
        console.warn(`JSON parse failed for ${symbol}:`, dataPart.substring(0, 100));
        return { success: false, count: 0, message: "Invalid JSON" };
      }

      if (data && data.__ERROR) {
        console.warn(`API Error for ${symbol}: ${data.__ERRORMSG}`);
        // If one API fails, we could potentially try a fallback here in the future
        return { success: false, count: 0, message: data.__ERRORMSG || "API Error" };
      }

      if (!Array.isArray(data)) {
        console.warn(`Expected array for ${symbol}, got:`, typeof data);
        return { success: false, count: 0, message: "Unexpected data structure" };
      }

      let count = 0;
      for (const item of data) {
        // Handle different field names from different Sina APIs
        const date = item.day || item.d || item.date;
        const open = item.open || item.o;
        const high = item.high || item.h;
        const low = item.low || item.l;
        const close = item.close || item.c;
        const volume = item.volume || item.v;
        const amount = item.amount || item.a;

        if (!date || !close) continue;

        await crud.upsertStockPrice({
          stock_id: stock.id,
          date: date.split(' ')[0], // Remove time if present
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseInt(volume),
          amount: amount ? parseFloat(amount) : undefined
        });
        count++;
      }
      return { success: true, count };
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
