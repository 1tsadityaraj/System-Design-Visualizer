import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_ITEMS = [
    { color: '#22c55e', label: 'Healthy', desc: 'Operating normally' },
    { color: '#f59e0b', label: 'Warning', desc: 'Performance degraded' },
    { color: '#ef4444', label: 'Error / Down', desc: 'Service unavailable' },
    { color: '#64748b', label: 'Offline', desc: 'Manually disabled' },
    { color: '#fbbf24', label: 'Degraded (Chaos)', desc: 'Impacted by upstream failure', dashed: true },
    { color: '#ef4444', label: 'Killed (Chaos)', desc: 'Destroyed in simulation', skull: true },
];

const NODE_TYPES = [
    { color: '#94a3b8', label: 'Client App', type: 'Frontend / User-facing' },
    { color: '#3b82f6', label: 'API Server', type: 'Compute' },
    { color: '#8b5cf6', label: 'Lambda / FaaS', type: 'Serverless' },
    { color: '#f59e0b', label: 'SQL Database', type: 'Storage' },
    { color: '#f97316', label: 'NoSQL / MongoDB', type: 'Storage' },
    { color: '#ef4444', label: 'S3 / Object Store', type: 'Storage' },
    { color: '#10b981', label: 'Load Balancer', type: 'Networking' },
    { color: '#06b6d4', label: 'API Gateway', type: 'Networking' },
    { color: '#14b8a6', label: 'CDN', type: 'Networking / Edge' },
    { color: '#eab308', label: 'Redis Cache', type: 'Middleware' },
    { color: '#ec4899', label: 'Message Queue', type: 'Middleware' },
];

const EDGE_TYPES = [
    { color: '#64748b', label: 'Connection', style: 'solid', desc: 'Standard data flow' },
    { color: '#22d3ee', label: 'Active Traffic', style: 'animated', desc: 'Animated traffic flow' },
    { color: '#ef4444', label: 'Insecure', style: 'dashed-thick', desc: 'Security vulnerability (no Gateway/WAF)' },
    { color: '#22c55e', label: 'Rerouted', style: 'dashed', desc: 'Traffic rerouted to replica (Chaos)' },
    { color: '#ef4444', label: 'Dead', style: 'dashed-faded', desc: 'Broken connection (Chaos)' },
    { color: '#64748b', label: 'Cross-Region', style: 'long-dash', desc: 'Higher latency path' },
];

export default function Legend() {
    const [open, setOpen] = useState(false);
    const [section, setSection] = useState('status');

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg text-[12px] text-slate-400 hover:text-white hover:border-slate-600 transition-all shadow-lg"
            >
                <BookOpen size={13} />
                Legend
            </button>
        );
    }

    return (
        <div className="absolute bottom-4 right-4 z-30 w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-violet-400" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Legend</span>
                </div>
                <button
                    onClick={() => setOpen(false)}
                    className="text-slate-500 hover:text-white text-[18px] leading-none transition-colors"
                >
                    ×
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700/30">
                {['status', 'nodes', 'edges'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setSection(tab)}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${section === tab
                                ? 'text-white border-b-2 border-blue-500 bg-slate-700/20'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="max-h-[250px] overflow-y-auto">
                {section === 'status' && (
                    <div className="py-1.5">
                        {STATUS_ITEMS.map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-slate-700/10">
                                <div className="relative">
                                    <span
                                        className="w-3 h-3 rounded-full block border border-slate-900"
                                        style={{ backgroundColor: item.color }}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[12px] text-white font-medium">{item.label}</span>
                                    <span className="text-[10px] text-slate-500 ml-1.5">{item.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {section === 'nodes' && (
                    <div className="py-1.5">
                        {NODE_TYPES.map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-slate-700/10">
                                <span
                                    className="w-3 h-3 rounded block shrink-0"
                                    style={{ backgroundColor: item.color, opacity: 0.8 }}
                                />
                                <div className="min-w-0 flex-1">
                                    <span className="text-[12px] text-white font-medium">{item.label}</span>
                                    <span className="text-[10px] text-slate-500 ml-1.5">{item.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {section === 'edges' && (
                    <div className="py-1.5">
                        {EDGE_TYPES.map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-slate-700/10">
                                <div className="w-6 h-0.5 shrink-0 relative" style={{
                                    border: 'none',
                                }}>
                                    <svg width="24" height="4" viewBox="0 0 24 4">
                                        <line
                                            x1="0" y1="2" x2="24" y2="2"
                                            stroke={item.color}
                                            strokeWidth={item.style === 'dashed-thick' ? 3 : 2}
                                            strokeDasharray={
                                                item.style === 'dashed' ? '4 2' :
                                                    item.style === 'dashed-thick' ? '6 3' :
                                                        item.style === 'dashed-faded' ? '4 4' :
                                                            item.style === 'long-dash' ? '8 4' : 'none'
                                            }
                                            opacity={item.style === 'dashed-faded' ? 0.5 : 1}
                                        />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[12px] text-white font-medium">{item.label}</span>
                                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
