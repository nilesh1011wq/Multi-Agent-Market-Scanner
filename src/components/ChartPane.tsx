import React, { useState, useMemo } from 'react';
import { Candle, FeatureSnapshot, Timeframe } from '../types/market';
import { BrokerPosition } from '../types/broker';

interface ChartPaneProps {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  snapshot: FeatureSnapshot | null;
  onSelectTimeframe: (tf: Timeframe) => void;
  activePositions?: BrokerPosition[];
}

export const ChartPane: React.FC<ChartPaneProps> = ({
  symbol,
  timeframe,
  candles,
  snapshot,
  onSelectTimeframe,
  activePositions = [],
}) => {
  const [showEMAs, setShowEMAs] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showPivots, setShowPivots] = useState(true);
  const [showSR, setShowSR] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const timeframes: Timeframe[] = ['M15', 'H1', 'H4', 'D1', 'W1'];

  // Filter active broker positions matching the current symbol
  const symbolPositions = useMemo(() => {
    return activePositions.filter((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [activePositions, symbol]);

  // Slice visible candles (last 60 bars for clean display)
  const visibleCandles = useMemo(() => {
    return candles.slice(Math.max(0, candles.length - 60));
  }, [candles]);

  // Determine chart price range (including active position Entry/SL/TP levels)
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

    for (const pos of symbolPositions) {
      if (pos.openPrice > 0) {
        min = Math.min(min, pos.openPrice);
        max = Math.max(max, pos.openPrice);
      }
      if (pos.stopLoss > 0) {
        min = Math.min(min, pos.stopLoss);
        max = Math.max(max, pos.stopLoss);
      }
      if (pos.takeProfit > 0) {
        min = Math.min(min, pos.takeProfit);
        max = Math.max(max, pos.takeProfit);
      }
    }

    const padding = (max - min) * 0.08 || 0.001;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVolume: maxVol || 1000,
    };
  }, [visibleCandles, symbolPositions]);

  const chartHeight = 360;
  const chartWidth = 720;
  const priceRange = maxPrice - minPrice || 1;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const hoveredCandle =
    hoverIndex !== null && visibleCandles[hoverIndex]
      ? visibleCandles[hoverIndex]
      : visibleCandles[visibleCandles.length - 1];

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

          {/* Live Broker Open Position Trade Overlays (Entry, SL, TP) */}
          {symbolPositions.map((pos) => (
            <g key={`pos-overlay-${pos.brokerTicketId}`}>
              {/* Entry Line */}
              {pos.openPrice > 0 && (
                <line
                  x1="0"
                  y1={getY(pos.openPrice)}
                  x2={chartWidth}
                  y2={getY(pos.openPrice)}
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                />
              )}
              {/* Stop Loss Line */}
              {pos.stopLoss > 0 && (
                <line
                  x1="0"
                  y1={getY(pos.stopLoss)}
                  x2={chartWidth}
                  y2={getY(pos.stopLoss)}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
              )}
              {/* Take Profit Line */}
              {pos.takeProfit > 0 && (
                <line
                  x1="0"
                  y1={getY(pos.takeProfit)}
                  x2={chartWidth}
                  y2={getY(pos.takeProfit)}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
              )}
            </g>
          ))}

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

        {/* Live Open Trade Badges on Chart */}
        {symbolPositions.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-none">
            {symbolPositions.map((pos) => (
              <div
                key={`badge-${pos.brokerTicketId}`}
                className="bg-slate-950/90 border border-cyan-500/40 px-2.5 py-1.5 rounded text-[10px] font-mono shadow-lg flex items-center gap-2"
              >
                <span
                  className={`px-1.5 py-0.2 rounded font-bold ${
                    pos.direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {pos.direction} {pos.units}
                </span>
                <span className="text-cyan-300 font-semibold">@ {pos.openPrice}</span>
                <span className="text-rose-400">SL: {pos.stopLoss}</span>
                <span className="text-emerald-400">TP: {pos.takeProfit}</span>
                <span
                  className={`font-bold tabular-nums ${
                    pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLR >= 0 ? '+' : ''}
                  {pos.unrealizedPnLR.toFixed(2)}R)
                </span>
              </div>
            ))}
          </div>
        )}

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
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-cyan-400 inline-block"></span> PP / Entry</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-rose-500 inline-block"></span> R1 / Stop Loss</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block"></span> S1 / Take Profit</span>
        </div>
      </div>
    </div>
  );
};

