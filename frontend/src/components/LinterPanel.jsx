import React from 'react';
import useDiagramStore from '../store/useDiagramStore';
import { AlertTriangle, Info, XCircle, ShieldAlert } from 'lucide-react';

const ICONS = {
    error: <XCircle size={14} className="text-red-400 shrink-0" />,
    warning: <AlertTriangle size={14} className="text-amber-400 shrink-0" />,
    info: <Info size={14} className="text-blue-400 shrink-0" />,
};

const BG = {
    error: 'bg-red-500/5 border-red-500/20 hover:border-red-500/40',
    warning: 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
    info: 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40',
};

export default function LinterPanel() {
    const warnings = useDiagramStore((s) => s.warnings);
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-4 max-w-sm z-30 space-y-1.5 animate-slide-up">
            <div className="flex items-center gap-2 mb-1.5">
                <ShieldAlert size={13} className="text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Linter — {warnings.length} issue{warnings.length !== 1 ? 's' : ''}
                </span>
            </div>
            {warnings.map((w) => (
                <div key={w.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border backdrop-blur-xl transition-colors ${BG[w.severity]}`}>
                    {ICONS[w.severity]}
                    <div>
                        <div className="text-[12px] font-semibold text-white">{w.title}</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">{w.message}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
