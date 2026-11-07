import React, { useState } from 'react';
import { WATCHLIST } from '../data/marketDataService';
import { BrokerId } from '../types/broker';
import { getBrokerSymbol } from '../broker/symbolMapper';
import { Search, Tag } from 'lucide-react';

interface WatchlistSidebarProps {
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  priceMap: Record<string, number>;
  regimeMap: Record<string, string>;
  activeBrokerId?: BrokerId;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  activeSymbol,
  onSelectSymbol,
  priceMap,
  regimeMap,
  activeBrokerId = 'CAPITAL_COM',
}) => {
  const [filter, setFilter] = useState<'ALL' | 'FOREX' | 'COMMODITY'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = WATCHLIST.filter((item) => {
    if (filter !== 'ALL' && item.assetClass !== filter) return false;
    if (search && !item.symbol.toLowerCase().includes(search.toLowerCase()) && !item.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-72 bg-[#0c101a] border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-2.5 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 12 Watchlist assets..."
            className="w-full bg-slate-900/90 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs pl-8 pr-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded border border-slate-800/80">
          {(['ALL', 'FOREX', 'COMMODITY'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-1 py-1 text-[11px] font-mono font-medium rounded transition-colors ${
                filter === cat
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'COMMODITY' ? 'COMM' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filtered.map((item) => {
          const isSelected = item.symbol === activeSymbol;
          const price = priceMap[item.symbol] ?? 0;
          const regime = regimeMap[item.symbol] ?? 'evaluating';
          const brokerEpic = getBrokerSymbol(item.symbol, activeBrokerId);

          let regimeColor = 'text-slate-400';
          if (regime.includes('bull')) regimeColor = 'text-emerald-400';
          else if (regime.includes('bear')) regimeColor = 'text-rose-400';
          else if (regime === 'chop') regimeColor = 'text-amber-400';

          return (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`w-full p-2.5 text-left transition-colors flex items-center justify-between ${
                isSelected
                  ? 'bg-cyan-500/10 border-l-2 border-cyan-400 pl-2'
                  : 'hover:bg-slate-900/50'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-200">
                    {item.symbol}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400">
                    {item.assetClass === 'FOREX' ? 'FX' : 'COMM'}
                  </span>
                  {brokerEpic !== item.symbol && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 flex items-center gap-0.5" title={`Mapped Broker Epic on ${activeBrokerId}`}>
                      <Tag className="w-2.5 h-2.5" />
                      {brokerEpic}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[140px] mt-0.5">
                  {item.name}
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-xs font-semibold text-slate-100 tabular-nums">
                  {price ? price.toFixed(item.digits) : '---'}
                </div>
                <div className={`text-[10px] capitalize tabular-nums ${regimeColor}`}>
                  {regime.replace('_', ' ')}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between items-center bg-slate-950/50">
        <span>12 ASSETS MATCHED</span>
        <span className="text-cyan-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE YAHOO FEED
        </span>
      </div>
    </aside>
  );
};
