import React, { useState, useMemo } from 'react';
import { Candle, FeatureSnapshot, Timeframe } from '../types/market';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface ChartPaneProps {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  snapshot: FeatureSnapshot | null;
  onSelectTimeframe: (tf: Timeframe) => void;
}

export const ChartPane: React.FC<ChartPaneProps> = ({
  symbol,
  timeframe,
  candles,
  snapshot,
  onSelectTimeframe,
}) => {
  const [showEMAs, setShowEMAs] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showPivots, setShowPivots] = useState(true);
  const [showSR, setShowSR] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const timeframes: Timeframe[] = ['M15', 'H1', 'H4', 'D1', 'W1'];

  // Slice visible candles (last 60 bars for clean display)
  const visibleCandles = useMemo(() => {
    return candles.slice(Math.max(0, candles.length - 60));
  }, [candles]);

  // Determine chart price range
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 1, maxPrice: 2, maxVolume: 1000 };
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const padding = (max - min) * 0.08 || 0.001;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVolume: maxVol || 1000,
    };
  }, [visibleCandles]);

  const chartHeight = 360;
  const chartWidth = 720;
  const priceRange = maxPrice - minPrice || 1;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const hoveredCandle = hoverIndex !== null && visibleCandles[hoverIndex] ? visibleCandles[hoverIndex] : visibleCandles[visibleCandles.length - 1];

  return (
    <div className="bg-[#090d16] border-b border-slate-800 flex flex-col">
      {/* Chart Toolbar */}
      <div className="h-10 border-b border-slate-800 px-3 flex items-center justify-between text-xs font-mono">
        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                timeframe === tf
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Overlays Toggles */}
        <div className="flex items-center gap-2 text-slate-400">
          <button
            onClick={() => setShowEMAs(!showEMAs)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              showEMAs ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500'
            }`}
            title="Toggle EMA 20/50/200"
          >
            <span>EMA</span>
          </button>
          <button
            onClick={() => setShowBB(!showBB)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              showBB ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-500'
            }`}
            title="Toggle Bollinger Bands"
          >
            <span>BB</span>
          </button>
          <button
            onClick={() => setShowPivots(!showPivots)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              showPivots ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-500'
            }`}
            title="Toggle Classical Pivots"
          >
            <span>PIVOTS</span>
          </button>
          <button
            onClick={() => setShowSR(!showSR)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              showSR ? 'text-rose-400 bg-rose-400/10' : 'text-slate-500'
            }`}
            title="Toggle S/R Clusters"
          >
            <span>S/R</span>
          </button>
        </div>

        {/* OHLCV Telemetry Readout */}
        {hoveredCandle && (
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 tabular-nums">
            <span>O: <span className="text-slate-200">{hoveredCandle.open}</span></span>
            <span>H: <span className="text-emerald-400">{hoveredCandle.high}</span></span>
            <span>L: <span className="text-rose-400">{hoveredCandle.low}</span></span>
            <span>C: <span className="text-cyan-300">{hoveredCandle.close}</span></span>
            <span>V: <span className="text-slate-300">{hoveredCandle.volume}</span></span>
          </div>
        )}
      </div>

      {/* Candlestick Canvas / SVG Viewport */}
      <div className="relative h-[360px] w-full overflow-hidden bg-[#090d16] select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Grid lines */}
          <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />
          <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />
          <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />

          {/* Pivots Overlay */}
          {showPivots && snapshot && (
            <g opacity="0.6">
              {/* PP */}
              <line x1="0" y1={getY(snapshot.indicators.pivots.pp)} x2={chartWidth} y2={getY(snapshot.indicators.pivots.pp)} stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
              {/* R1 */}
              <line x1="0" y1={getY(snapshot.indicators.pivots.r1)} x2={chartWidth} y2={getY(snapshot.indicators.pivots.r1)} stroke="#fb7185" strokeWidth="1" strokeDasharray="2 2" />
              {/* S1 */}
              <line x1="0" y1={getY(snapshot.indicators.pivots.s1)} x2={chartWidth} y2={getY(snapshot.indicators.pivots.s1)} stroke="#34d399" strokeWidth="1" strokeDasharray="2 2" />
            </g>
          )}

          {/* S/R Clusters Overlay */}
          {showSR && snapshot?.indicators.srClusters.map((c, i) => (
            <line
              key={i}
              x1="0"
              y1={getY(c.price)}
              x2={chartWidth}
              y2={getY(c.price)}
              stroke={c.type === 'resistance' ? '#f43f5e' : '#10b981'}
              strokeWidth={Math.min(3, 1 + c.touches * 0.5)}
              strokeOpacity="0.4"
            />
          ))}

          {/* Volume bars (at bottom of chart) */}
          {visibleCandles.map((c, idx) => {
            const barWidth = chartWidth / visibleCandles.length;
            const x = idx * barWidth;
            const volHeight = (c.volume / maxVolume) * 50;
            const isGreen = c.close >= c.open;
            return (
              <rect
                key={`vol_${idx}`}
                x={x + barWidth * 0.15}
                y={chartHeight - volHeight}
                width={barWidth * 0.7}
                height={volHeight}
                fill={isGreen ? '#10b981' : '#f43f5e'}
                opacity="0.25"
              />
            );
          })}

          {/* Candlesticks */}
          {visibleCandles.map((c, idx) => {
            const barWidth = chartWidth / visibleCandles.length;
            const x = idx * barWidth;
            const centerX = x + barWidth / 2;

            const isGreen = c.close >= c.open;
            const candleColor = isGreen ? '#10b981' : '#f43f5e';

            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(openY - closeY));

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                className="cursor-crosshair"
              >
                {/* Wick */}
                <line
                  x1={centerX}
                  y1={highY}
                  x2={centerX}
                  y2={lowY}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />
                {/* Candle Body */}
                <rect
                  x={x + barWidth * 0.15}
                  y={bodyTop}
                  width={barWidth * 0.7}
                  height={bodyHeight}
                  fill={candleColor}
                />
              </g>
            );
          })}

          {/* Crosshair on Hover */}
          {hoverIndex !== null && (
            <line
              x1={hoverIndex * (chartWidth / visibleCandles.length) + (chartWidth / visibleCandles.length) / 2}
              y1="0"
              x2={hoverIndex * (chartWidth / visibleCandles.length) + (chartWidth / visibleCandles.length) / 2}
              y2={chartHeight}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
          )}
        </svg>

        {/* Watermark / Instrument Details */}
        <div className="absolute top-3 left-4 pointer-events-none select-none">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-slate-100/90 tracking-tight">
              {symbol}
            </span>
            <span className="font-mono text-sm font-semibold text-slate-400">
              {timeframe}
            </span>
          </div>
          {snapshot && (
            <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-400">
              <span className="text-slate-300">REGIME:</span>
              <span className={snapshot.indicators.tradable ? 'text-emerald-400' : 'text-amber-400'}>
                {snapshot.indicators.regime.toUpperCase()}
              </span>
              <span>·</span>
              <span>ADX: <span className="text-slate-200">{snapshot.indicators.adx14}</span></span>
              <span>·</span>
              <span>ATR: <span className="text-slate-200">{snapshot.indicators.atr14}</span></span>
            </div>
          )}
        </div>

        {/* Level Legend Overlay */}
        <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-slate-500 flex items-center gap-3 bg-slate-950/70 px-2 py-1 rounded border border-slate-800/60">
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-cyan-400 inline-block"></span> PP Pivot</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-rose-500 inline-block"></span> R1 Resistance</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block"></span> S1 Support</span>
        </div>
      </div>
    </div>
  );
};
