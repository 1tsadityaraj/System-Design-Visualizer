import React, { useState } from 'react';
import useDiagramStore from '../store/useDiagramStore';
import { GitBranch, Clock, RotateCcw, Plus, ChevronDown, ChevronRight } from 'lucide-react';

export default function SnapshotPanel() {
    const { snapshots, saveSnapshot, restoreSnapshot } = useDiagramStore();
    const [open, setOpen] = useState(false);

    return (
        <div className="absolute top-4 left-4 z-30">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 hover:border-slate-600 rounded-lg text-[13px] text-white transition-all shadow-lg"
            >
                <GitBranch size={13} className="text-violet-400" />
                <span className="font-medium">Versions</span>
                <span className="text-[10px] bg-slate-700/60 px-1.5 py-0.5 rounded-full text-slate-300">{snapshots.length}</span>
                {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>

            {open && (
                <div className="mt-2 w-60 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden animate-slide-down">
                    <div className="p-3 border-b border-slate-700/40 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Snapshots</span>
                        <button onClick={saveSnapshot} className="flex items-center gap-1 text-[11px] px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-medium transition-colors">
                            <Plus size={11} /> Save
                        </button>
                    </div>
                    {snapshots.length === 0 ? (
                        <div className="p-4 text-center text-[12px] text-slate-500">No snapshots yet.</div>
                    ) : (
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-700/30">
                            {[...snapshots].reverse().map((s) => (
                                <div key={s.id} className="p-2.5 hover:bg-slate-700/20 transition-colors group">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[13px] font-semibold text-white">{s.version}</span>
                                        <button onClick={() => restoreSnapshot(s.id)} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-all">
                                            <RotateCcw size={9} /> Restore
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <Clock size={9} />{new Date(s.timestamp).toLocaleTimeString()} · {s.nodes.length}n, {s.edges.length}e
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
