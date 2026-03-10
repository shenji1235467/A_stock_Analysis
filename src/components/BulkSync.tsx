import React, { useState } from "react";
import { RefreshCw, List, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface SyncResult {
  symbol: string;
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
}

interface BulkSyncProps {
  onBack: () => void;
  onSyncComplete: () => void;
}

export default function BulkSync({ onBack, onSyncComplete }: BulkSyncProps) {
  const [input, setInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);

  const handleBulkSync = async () => {
    const symbols = input
      .split(/[\n, ]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    if (symbols.length === 0) {
      alert("Please enter at least one stock symbol (e.g., sh600000)");
      return;
    }

    setSyncing(true);
    setResults([]);
    try {
      const res = await fetch("/api/stocks/sync-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });

      if (!res.ok) throw new Error("Bulk sync failed");
      const data = await res.json();
      setResults(data);
      onSyncComplete();
    } catch (err) {
      console.error("Bulk sync failed", err);
      alert("Failed to perform bulk sync. Check console for details.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter">Bulk Data Sync</h2>
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest mt-1">
            Import specific stocks to your database
          </p>
        </div>
        <button 
          onClick={onBack}
          className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          ← Back to Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Enter Stock Symbols
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="sh600000, sz000001, bj830832..."
              className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-2 italic">
              Separate symbols by commas, spaces, or new lines. Use prefix (sh/sz/bj).
            </p>
            
            <button
              onClick={handleBulkSync}
              disabled={syncing || !input.trim()}
              className="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Syncing Data...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Start Bulk Sync</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sync Results</h3>
              {results.length > 0 && (
                <span className="text-[10px] font-mono text-zinc-600">{results.length} Processed</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 italic text-sm">
                  <List className="w-8 h-8 mb-2 opacity-20" />
                  <p>Results will appear here after sync</p>
                </div>
              ) : (
                results.map((res, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between ${res.success ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      {res.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <div className="text-xs font-bold uppercase">{res.symbol}</div>
                        <div className="text-[10px] text-zinc-500">
                          {res.success ? `Synced ${res.count} price records` : (res.message || res.error)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
