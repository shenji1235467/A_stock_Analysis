import React, { useState, useEffect } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Area
} from "recharts";
import { Search, TrendingUp, Activity, BarChart3, RefreshCw, ChevronRight, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BulkSync from "./components/BulkSync";

interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
}

interface StockPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  macd?: number;
  diff?: number;
  dea?: number;
  rsi?: number;
}

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"analysis" | "bulk">("analysis");

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStocks(data);
      } else {
        console.error("API returned non-array data for stocks:", data);
        setStocks([]);
      }
    } catch (err) {
      console.error("Failed to fetch stocks", err);
      setStocks([]);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/stocks/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const result = await res.json();
      alert(result.message || "Sync started in background. It may take a few minutes to complete.");
      // We don't await fetchStocks here because it might be empty initially
      setTimeout(fetchStocks, 2000); 
    } catch (err) {
      console.error("Sync failed", err);
      alert("Failed to sync stock data. Please try again later.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectStock = async (stock: Stock) => {
    setSelectedStock(stock);
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/${stock.symbol}/prices?limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPrices(data);
      } else {
        console.error("API returned non-array data for prices:", data);
        setPrices([]);
      }
    } catch (err) {
      console.error("Failed to fetch prices", err);
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = Array.isArray(stocks) ? stocks.filter(s => 
    s.name.includes(searchTerm) || s.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans p-6">
      <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-2 italic serif">
            STOCK<span className="text-emerald-500">ANALYSIS</span>
          </h1>
          <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
            Chinese A-Share Market Intelligence
          </p>
        </div>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold uppercase tracking-tighter">Sync All A-Shares</span>
        </button>
        <button 
          onClick={() => setView(view === "analysis" ? "bulk" : "analysis")}
          className={`flex items-center gap-2 px-4 py-2 border rounded-full transition-all ${view === 'bulk' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          <PlusCircle className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-tighter">{view === 'bulk' ? 'View Analysis' : 'Bulk Sync'}</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === "analysis" ? (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Sidebar: Stock List */}
              <div className="lg:col-span-3 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Search Symbol or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden h-[600px] flex flex-col">
                  <div className="p-4 border-bottom border-zinc-800 bg-zinc-900">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Market Watch</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredStocks.map(stock => (
                      <button
                        key={stock.id}
                        onClick={() => handleSelectStock(stock)}
                        className={`w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0 ${selectedStock?.id === stock.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''}`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-sm">{stock.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">{stock.symbol}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700" />
                      </button>
                    ))}
                    {filteredStocks.length === 0 && (
                      <div className="p-8 text-center text-zinc-600 italic text-sm">No stocks found</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content: Charts */}
              <div className="lg:col-span-9 space-y-6">
                {!selectedStock ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                    <TrendingUp className="w-16 h-16 text-zinc-800 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Select a stock to begin analysis</h3>
                    <p className="text-zinc-500 max-w-md">
                      Choose a symbol from the market watch list to view historical performance and technical indicators.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stock Header */}
                    <div className="flex justify-between items-start bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-3xl font-bold">{selectedStock.name}</h2>
                          <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400">{selectedStock.symbol}</span>
                        </div>
                        <p className="text-zinc-500 text-sm">{selectedStock.sector} • {selectedStock.industry}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Latest Close</div>
                        <div className="text-4xl font-bold text-emerald-500">
                          {prices.length > 0 ? prices[prices.length - 1].close.toFixed(2) : "---"}
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div className="h-[400px] flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={selectedStock.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-6"
                        >
                          {/* Price Chart */}
                          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                            <div className="flex items-center gap-2 mb-6">
                              <BarChart3 className="w-4 h-4 text-emerald-500" />
                              <h3 className="text-sm font-bold uppercase tracking-widest">Price History (100 Days)</h3>
                            </div>
                            <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={prices}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#525252" 
                                    fontSize={10} 
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                  />
                                  <YAxis stroke="#525252" fontSize={10} domain={['auto', 'auto']} />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                  />
                                  <Area type="monotone" dataKey="close" fill="url(#colorClose)" stroke="#10b981" />
                                  <defs>
                                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* MACD Chart */}
                            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                              <div className="flex items-center gap-2 mb-6">
                                <Activity className="w-4 h-4 text-blue-500" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">MACD Indicator</h3>
                              </div>
                              <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={prices}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis stroke="#525252" fontSize={10} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="macd" fill="#3b82f6" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* RSI Chart */}
                            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                              <div className="flex items-center gap-2 mb-6">
                                <Activity className="w-4 h-4 text-orange-500" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">RSI Indicator</h3>
                              </div>
                              <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={prices}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis stroke="#525252" fontSize={10} domain={[0, 100]} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    />
                                    <Line type="monotone" dataKey="rsi" stroke="#f97316" dot={false} strokeWidth={2} />
                                    {/* RSI Reference Lines */}
                                    <Line type="monotone" dataKey={() => 70} stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                                    <Line type="monotone" dataKey={() => 30} stroke="#22c55e" strokeDasharray="5 5" dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <BulkSync 
              onBack={() => setView("analysis")} 
              onSyncComplete={fetchStocks}
            />
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
