import React, { useState } from 'react';
import {
  AgentName,
  AnySpecialistOutput,
  ArbiterOutput,
  FullDebateTranscript,
  RiskManagerOutput,
  Round2AgentOutput,
} from '../types/debate';
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  Users,
  GitCompare,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Code,
  Zap,
} from 'lucide-react';

interface DebateChamberProps {
  transcript: FullDebateTranscript | null;
  isRunning: boolean;
  onRunDebate: () => void;
  durationMs?: number;
}

export const DebateChamber: React.FC<DebateChamberProps> = ({
  transcript,
  isRunning,
  onRunDebate,
  durationMs,
}) => {
  const [activeTab, setActiveTab] = useState<'ARBITER' | 'CROSS_EXAM' | 'ROUND_1' | 'RISK_GATE' | 'TRANSCRIPT'>('ARBITER');
  const [selectedAgentCard, setSelectedAgentCard] = useState<string>('Trend & Momentum');

  const arbiter = transcript?.arbiter;
  const round1 = transcript?.round1;
  const round2 = transcript?.round2;
  const riskMgr = round1?.['Risk Manager'] as RiskManagerOutput | undefined;

  return (
    <div className="bg-[#0b0f19] border-t border-slate-800 p-4 font-mono text-xs space-y-3.5">
      {/* Top Chamber Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 uppercase">
            Phase 3: 10-Agent Specialist Debate & Chief Arbiter
          </span>
        </div>

        <div className="flex items-center gap-3">
          {durationMs !== undefined && (
            <span className="text-[11px] text-slate-500 tabular-nums">
              DEBATE LATENCY: {durationMs}ms
            </span>
          )}

          <button
            onClick={onRunDebate}
            disabled={isRunning}
            className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'ORCHESTRATING 3 ROUNDS...' : 'RUN 10-AGENT DEBATE'}</span>
          </button>
        </div>
      </div>

      {arbiter ? (
        <div className="space-y-3">
          {/* Arbiter Recommendation Action Strip */}
          <div className="bg-slate-900/90 p-3.5 rounded border border-slate-800/90 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
            {/* 1. Final Recommendation */}
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 font-bold uppercase">FINAL RECOMMENDATION</div>
              <div
                className={`text-lg font-black tracking-tight px-2.5 py-1 rounded inline-block text-center ${
                  arbiter.final_recommendation === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : arbiter.final_recommendation === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {arbiter.final_recommendation}
              </div>
            </div>

            {/* 2. Confidence & Consensus */}
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase">CONFIDENCE / CONSENSUS</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums">
                {arbiter.confidence}% · <span className="capitalize text-cyan-300">{arbiter.consensus_level}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                MTF: <span className="text-slate-300 capitalize">{arbiter.timeframe_alignment}</span>
              </div>
            </div>

            {/* 3. Evidence Quality Badge */}
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase">EVIDENCE QUALITY</div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded ${
                    arbiter.evidence_quality.badge === 'A'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : arbiter.evidence_quality.badge === 'B'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  BADGE {arbiter.evidence_quality.badge}
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  N={arbiter.evidence_quality.analog_sample_size}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {arbiter.evidence_quality.data_depth_years}Y History · {arbiter.evidence_quality.regime_match} match
              </div>
            </div>

            {/* 4. Entry Zone & Size */}
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase">ENTRY ZONE / SIZE</div>
              <div className="text-xs font-semibold text-slate-200 tabular-nums">
                [{arbiter.entry_zone[0]}, {arbiter.entry_zone[1]}]
              </div>
              <div className="text-[10px] text-slate-500">
                Size modifier: <span className="text-slate-200">{arbiter.size_modifier}x</span>
              </div>
            </div>

            {/* 5. Stop Loss & Take Profits */}
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase">STOP LOSS / TP1 / TP2</div>
              <div className="text-xs font-semibold text-rose-400 tabular-nums">
                SL: {arbiter.stop_loss}
              </div>
              <div className="text-[10px] text-emerald-400 tabular-nums">
                TP1: {arbiter.take_profit[0]} · TP2: {arbiter.take_profit[1]}
              </div>
            </div>

            {/* 6. Risk-Reward Ratio */}
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase">RISK : REWARD</div>
              <div className="text-sm font-bold text-cyan-300 tabular-nums">
                1 : {arbiter.risk_reward}
              </div>
              <div className="text-[10px] text-slate-500">
                {arbiter.risk_reward >= 1.5 ? 'Meets ≥ 1.5 gate' : 'Poor R:R'}
              </div>
            </div>
          </div>

          {/* Chamber Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-[#090d16] font-mono text-xs">
            <button
              onClick={() => setActiveTab('ARBITER')}
              className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'ARBITER'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>ROUND 3: ARBITER SYNTHESIS</span>
            </button>
            <button
              onClick={() => setActiveTab('CROSS_EXAM')}
              className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'CROSS_EXAM'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>ROUND 2: CROSS-EXAMINATION</span>
            </button>
            <button
              onClick={() => setActiveTab('ROUND_1')}
              className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'ROUND_1'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ROUND 1: 10 SPECIALIST VOTES</span>
            </button>
            <button
              onClick={() => setActiveTab('RISK_GATE')}
              className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'RISK_GATE'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>RISK MANAGER VETO MATRIX</span>
            </button>
            <button
              onClick={() => setActiveTab('TRANSCRIPT')}
              className={`py-2 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'TRANSCRIPT'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>TRANSCRIPT (JSON)</span>
            </button>
          </div>

          {/* Tab 1: Chief Arbiter Synthesis */}
          {activeTab === 'ARBITER' && (
            <div className="space-y-3">
              {/* Rationale & Judicial Verdict */}
              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800/80 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>JUDICIAL SYNTHESIS RATIONALE</span>
                  <span className="text-slate-500 text-[10px]">EVIDENCE-WEIGHTED JUDGMENT</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {arbiter.rationale}
                </p>
              </div>

              {/* Bull vs Bear Case Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>STRONGEST BULL CASE</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {arbiter.strongest_bull_case}
                  </p>
                </div>

                <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
                  <div className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>STRONGEST BEAR CASE</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {arbiter.strongest_bear_case}
                  </p>
                </div>
              </div>

              {/* Key Disagreement & Invalidation Trigger */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
                  <div className="text-[11px] text-amber-400 font-semibold">
                    KEY UNRESOLVED DISPUTE
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {arbiter.key_disagreement}
                  </p>
                </div>

                <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
                  <div className="text-[11px] text-rose-400 font-semibold">
                    TRADE INVALIDATION TRIGGER
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {arbiter.invalidation}
                  </p>
                </div>
              </div>

              {/* Agent Contributions & Influence Table */}
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2">
                <div className="text-[11px] text-slate-400 font-semibold">
                  AGENT VOTE & INFLUENCE DISTRIBUTION
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {arbiter.agent_contributions.map((ag) => (
                    <div
                      key={ag.agent}
                      className="bg-slate-950/70 p-2 rounded border border-slate-800/60 text-[11px] space-y-0.5"
                    >
                      <div className="text-slate-300 truncate font-semibold">{ag.agent}</div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-[10px] ${
                            ag.vote === 'BUY'
                              ? 'text-emerald-400'
                              : ag.vote === 'SELL'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {ag.vote}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          w:{ag.weight}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-[10px] text-slate-500 text-center pt-1">
                {arbiter.disclaimer}
              </div>
            </div>
          )}

          {/* Tab 2: Round 2 Cross-Examination Matrix */}
          {activeTab === 'CROSS_EXAM' && round2 && (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-400 pb-1">
                Round 2 requires each agent to review all peer analyses, explicitly cite their primary disagreement, name the most convincing peer argument, and state whether they revised their view:
              </div>

              <div className="space-y-2">
                {(Object.entries(round2) as [AgentName, Round2AgentOutput][]).map(([name, r2]) => (
                  <div
                    key={name}
                    className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            r2.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : r2.direction === 'SELL'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {r2.direction} ({r2.confidence}%)
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          r2.revised
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                            : 'text-slate-500'
                        }`}
                      >
                        {r2.revised ? 'REVISED VIEW' : 'HELD FIRM'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      {/* Disagreement */}
                      <div className="bg-slate-950/70 p-2 rounded border border-slate-800/60 space-y-0.5">
                        <div className="text-[10px] text-rose-400 font-semibold">
                          DISAGREES WITH: {r2.disagrees_with.agent}
                        </div>
                        <div className="text-slate-300">{r2.disagrees_with.reason}</div>
                      </div>

                      {/* Convinced by */}
                      <div className="bg-slate-950/70 p-2 rounded border border-slate-800/60 space-y-0.5">
                        <div className="text-[10px] text-cyan-400 font-semibold">
                          CONVINCED BY: {r2.convinced_by.agent}
                        </div>
                        <div className="text-slate-300">{r2.convinced_by.reason}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Round 1 Specialist Votes */}
          {activeTab === 'ROUND_1' && round1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.entries(round1) as [AgentName, AnySpecialistOutput][]).map(([name, r1]) => (
                <div
                  key={name}
                  className="bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">{name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        r1.direction === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : r1.direction === 'SELL'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {r1.direction} ({r1.confidence}%)
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                    {r1.reasoning}
                  </p>

                  <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-800/60 pt-1">
                    <span>Invalidation: {r1.invalidation_level}</span>
                    <span>Evidence: {r1.evidence.length} claims</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Risk Manager Veto Matrix */}
          {activeTab === 'RISK_GATE' && riskMgr && (
            <div className="bg-slate-900/60 p-4 rounded border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-slate-100">
                    Agent 10: Risk Manager Hard Veto Matrix
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    riskMgr.decision === 'APPROVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : riskMgr.decision === 'REDUCE_SIZE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  DECISION: {riskMgr.decision}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 space-y-1">
                  <div className="text-slate-500 text-[10px]">STOP LOSS STRUCTURE</div>
                  <div className="text-rose-400 font-bold text-sm tabular-nums">
                    {riskMgr.stop_loss}
                  </div>
                  <div className="text-[10px] text-slate-400">ATR & Structure aligned</div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 space-y-1">
                  <div className="text-slate-500 text-[10px]">RISK : REWARD CHECK</div>
                  <div className="text-cyan-300 font-bold text-sm tabular-nums">
                    1 : {riskMgr.risk_reward}
                  </div>
                  <div className="text-[10px] text-slate-400">Gate: Minimum 1.5</div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 space-y-1">
                  <div className="text-slate-500 text-[10px]">SIZE MODIFIER</div>
                  <div className="text-slate-200 font-bold text-sm tabular-nums">
                    {riskMgr.size_modifier}x
                  </div>
                  <div className="text-[10px] text-slate-400">Volatility calibrated</div>
                </div>
              </div>

              {riskMgr.veto_reasons.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded space-y-1">
                  <div className="text-rose-400 font-bold text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>ACTIVE VETO REASONS</span>
                  </div>
                  <ul className="text-slate-300 text-xs list-disc list-inside">
                    {riskMgr.veto_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Raw Transcript */}
          {activeTab === 'TRANSCRIPT' && (
            <div className="bg-[#080b12] p-3 rounded border border-slate-800 max-h-[50vh] overflow-y-auto text-slate-300 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(transcript, null, 2)}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/40 p-6 rounded border border-slate-800/60 text-center space-y-2">
          <div className="text-slate-400 text-xs">
            Ready to initiate full 3-round debate across all 10 specialist agents and Chief Arbiter.
          </div>
          <button
            onClick={onRunDebate}
            disabled={isRunning}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-xs transition-colors inline-flex items-center gap-2 shadow-md shadow-cyan-500/10"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'RUNNING DEBATE...' : 'LAUNCH 10-AGENT DEBATE'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
