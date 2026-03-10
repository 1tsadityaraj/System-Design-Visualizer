import React, { useState } from 'react';
import useDiagramStore from '../../store/useDiagramStore';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, ChevronDown, ChevronRight, FileWarning, Lock, Globe, UserX } from 'lucide-react';

const SEVERITY_CONFIG = {
    critical: {
        icon: ShieldX,
        bg: 'bg-red-500/10 border-red-500/30',
        color: 'text-red-400',
        badge: 'bg-red-500 text-white',
        label: 'CRITICAL',
    },
    high: {
        icon: ShieldAlert,
        bg: 'bg-orange-500/10 border-orange-500/30',
        color: 'text-orange-400',
        badge: 'bg-orange-500 text-white',
        label: 'HIGH',
    },
    medium: {
        icon: FileWarning,
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        color: 'text-yellow-400',
        badge: 'bg-yellow-500 text-black',
        label: 'MEDIUM',
    },
    low: {
        icon: Shield,
        bg: 'bg-blue-500/10 border-blue-500/30',
        color: 'text-blue-400',
        badge: 'bg-blue-500 text-white',
        label: 'LOW',
    },
};

const TYPE_ICONS = {
    'encryption': Lock,
    'network-isolation': Globe,
    'authentication': UserX,
    'availability': Globe,
};

export default function SecurityPanel() {
    const securityMode = useDiagramStore(s => s.securityMode);
    const securityFindings = useDiagramStore(s => s.securityFindings);
    const nodes = useDiagramStore(s => s.nodes);
    const [collapsed, setCollapsed] = useState({});

    if (!securityMode) return null;

    const criticals = securityFindings.filter(f => f.severity === 'critical');
    const highs = securityFindings.filter(f => f.severity === 'high');
    const mediums = securityFindings.filter(f => f.severity === 'medium');
    const lows = securityFindings.filter(f => f.severity === 'low');

    const score = Math.max(0, 100 - (criticals.length * 30) - (highs.length * 15) - (mediums.length * 5) - (lows.length * 2));
    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreLabel = score >= 80 ? 'Good' : score >= 50 ? 'Needs Attention' : 'Critical';

    const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    const FindingGroup = ({ severity, findings }) => {
        if (findings.length === 0) return null;
        const config = SEVERITY_CONFIG[severity];
        const Icon = config.icon;
        const isOpen = !collapsed[severity];

        return (
            <div className="border-b border-slate-700/30">
                <button
                    onClick={() => toggleSection(severity)}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Icon size={13} className={config.color} />
                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${config.color}`}>
                            {config.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${config.badge}`}>
                            {findings.length}
                        </span>
                    </div>
                    {isOpen ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                </button>
                {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                        {findings.map(f => {
                            const TypeIcon = TYPE_ICONS[f.type] || Shield;
                            return (
                                <div key={f.id} className={`px-3 py-2.5 rounded-lg border ${config.bg} transition-colors`}>
                                    <div className="flex items-start gap-2">
                                        <TypeIcon size={13} className={`${config.color} shrink-0 mt-0.5`} />
                                        <div className="min-w-0">
                                            <div className="text-[12px] font-semibold text-white">{f.title}</div>
                                            <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{f.message}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full overflow-y-auto">
            {/* Security Score */}
            <div className="px-4 py-4 border-b border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Security Score</span>
                    <span className={`text-[10px] font-bold ${scoreColor}`}>{scoreLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
                    <div className="flex-1">
                        <div className="w-full h-2 bg-slate-900/60 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-1 p-3 border-b border-slate-700/30">
                {[
                    { label: 'CRIT', count: criticals.length, color: 'text-red-400 bg-red-500/10' },
                    { label: 'HIGH', count: highs.length, color: 'text-orange-400 bg-orange-500/10' },
                    { label: 'MED', count: mediums.length, color: 'text-yellow-400 bg-yellow-500/10' },
                    { label: 'LOW', count: lows.length, color: 'text-blue-400 bg-blue-500/10' },
                ].map(s => (
                    <div key={s.label} className={`text-center py-1.5 rounded-lg ${s.color}`}>
                        <div className="text-[14px] font-bold">{s.count}</div>
                        <div className="text-[8px] font-bold tracking-wider">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Findings */}
            {securityFindings.length === 0 ? (
                <div className="px-4 py-8 text-center">
                    <ShieldCheck size={32} className="text-emerald-400 mx-auto mb-2" />
                    <div className="text-[13px] text-white font-semibold">All Clear!</div>
                    <div className="text-[11px] text-slate-500 mt-1">No security vulnerabilities detected.</div>
                </div>
            ) : (
                <>
                    <FindingGroup severity="critical" findings={criticals} />
                    <FindingGroup severity="high" findings={highs} />
                    <FindingGroup severity="medium" findings={mediums} />
                    <FindingGroup severity="low" findings={lows} />
                </>
            )}
        </div>
    );
}
