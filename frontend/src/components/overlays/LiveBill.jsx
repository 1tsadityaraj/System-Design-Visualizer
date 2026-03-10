import React, { useState } from 'react';
import useDiagramStore from '../../store/useDiagramStore';
import { DollarSign, ChevronDown, ChevronUp, TrendingUp, Zap, Globe } from 'lucide-react';

export default function LiveBill() {
    const costData = useDiagramStore(s => s.costData);
    const nodes = useDiagramStore(s => s.nodes);
    const [expanded, setExpanded] = useState(false);

    if (nodes.length === 0) return null;

    const { total, breakdown } = costData;
    const yearlyTotal = total * 12;

    return (
        <div className="absolute top-4 right-4 z-30 animate-slide-down">
            <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden min-w-[220px]">
                {/* Header */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/20 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 flex items-center justify-center">
                            <DollarSign size={16} className="text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Live Estimate</div>
                            <div className="text-[18px] font-bold text-white leading-tight">
                                ${total.toFixed(2)}
                                <span className="text-[11px] text-slate-500 font-normal">/mo</span>
                            </div>
                        </div>
                    </div>
                    {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>

                {/* Yearly Bar */}
                <div className="px-4 pb-2 flex items-center gap-2">
                    <TrendingUp size={11} className="text-blue-400" />
                    <span className="text-[11px] text-slate-400">
                        Annual: <span className="text-white font-semibold">${yearlyTotal.toFixed(0)}</span>
                    </span>
                </div>

                {/* Breakdown */}
                {expanded && (
                    <div className="border-t border-slate-700/40">
                        {breakdown.length === 0 ? (
                            <div className="px-4 py-3 text-[12px] text-slate-500 text-center">
                                Add components to see cost breakdown
                            </div>
                        ) : (
                            <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-700/20">
                                {breakdown.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-slate-700/10 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {item.type === 'network' ? (
                                                <Globe size={11} className="text-sky-400 shrink-0" />
                                            ) : (
                                                <Zap size={11} className="text-amber-400 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-[12px] text-white truncate">{item.node}</div>
                                                <div className="text-[10px] text-slate-500 truncate">{item.detail}</div>
                                            </div>
                                        </div>
                                        <span className="text-[12px] font-mono font-semibold text-emerald-400 shrink-0 ml-3">
                                            ${item.cost.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Per-hour callout */}
                        <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700/40 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">Hourly rate</span>
                            <span className="text-[12px] font-mono text-slate-300">${(total / 730).toFixed(4)}/hr</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
