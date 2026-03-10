import express from "express";
import { crud } from "../crud.ts";
import { services } from "../services.ts";
import { initDb } from "../models.ts";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const stocks = await crud.getStocks();
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

router.post("/sync", async (req, res) => {
  try {
    const result = await services.fetchStockList();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to sync stock list" });
  }
});

router.post("/sync-bulk", async (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: "Invalid symbols list" });
  }
  try {
    const results = await services.syncStocksBySymbols(symbols);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to sync bulk stocks" });
  }
});

router.get("/:symbol/prices", async (req, res) => {
  const { symbol } = req.params;
  const { limit } = req.query;
  try {
    let stock = await crud.getStockBySymbol(symbol);
    if (!stock) {
      // Try to fetch it if not in DB
      await services.fetchStockList();
      stock = await crud.getStockBySymbol(symbol);
    }
    if (!stock) return res.status(404).json({ error: "Stock not found" });

    let prices = await crud.getStockPrices(stock.id, parseInt(limit as string) || 100);
    if (prices.length === 0) {
      await services.fetchStockPrices(symbol);
      prices = await crud.getStockPrices(stock.id, parseInt(limit as string) || 100);
    }

    // Sort by date ascending for calculations
    const sortedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date));
    const closePrices = sortedPrices.map(p => p.close);

    const macdData = services.calculateMACD(closePrices);
    const rsiData = services.calculateRSI(closePrices);

    const result = sortedPrices.map((p, i) => ({
      ...p,
      macd: macdData.macd[i],
      diff: macdData.diff[i],
      dea: macdData.dea[i],
      rsi: rsiData[i],
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

export default router;
