import React from 'react';
import { Info, X, ShieldCheck, Activity, Layers, ServerCrash } from 'lucide-react';

export default function AboutModal({ open, onClose }) {
    if (!open) return null;

    const rules = [
        {
            icon: Activity,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-500/20',
            title: 'Content Delivery Network (CDN)',
            desc: 'Why add a CDN? It caches static assets (images, JS, CSS) at edge locations globally. This reduces latency from ~300ms to <20ms and significantly offloads egress traffic from your origin servers.'
        },
        {
            icon: Layers,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-500/20',
            title: 'Load Balancing',
            desc: 'Why a Load Balancer? It acts as a traffic cop. By distributing incoming requests across multiple backend servers, it ensures no single instance is overwhelmed, enabling horizontal scaling and zero-downtime deployments.'
        },
        {
            icon: ShieldCheck,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            border: 'border-purple-500/20',
            title: 'API Gateway',
            desc: 'Why an API Gateway? It prevents cascading failures by centralizing rate limiting, request validation, and authentication. Instead of exposing your database or internal microservices directly to the web, the gateway acts as a secure front door.'
        },
        {
            icon: ServerCrash,
            color: 'text-orange-400',
            bg: 'bg-orange-400/10',
            border: 'border-orange-500/20',
            title: 'Redundancy (No SPOF)',
            desc: 'Why multiple servers? A Single Point of Failure (SPOF) means if one EC2 instance crashes, your entire app goes offline. Redundant servers behind a load balancer provide high availability and fault tolerance.'
        }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[600px] max-h-[85vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <Info size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base text-white">The "Golden Path" Architecture</h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">Understanding distributed systems design patterns</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <p className="text-[13px] text-slate-300 leading-relaxed mb-6">
                        System Design visually represents the "N-tier" architecture. The static analysis linter enforces these best practices because they solve specific engineering challenges at scale.
                    </p>

                    <div className="grid gap-3">
                        {rules.map((rule, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${rule.border} ${rule.bg} flex gap-4 transition-colors hover:bg-opacity-20`}>
                                <div className="shrink-0 mt-0.5">
                                    <rule.icon size={18} className={rule.color} />
                                </div>
                                <div>
                                    <h3 className={`text-[13px] font-bold ${rule.color} mb-1.5 uppercase tracking-wide`}>
                                        {rule.title}
                                    </h3>
                                    <p className="text-[13px] text-slate-300 leading-relaxed">
                                        {rule.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[13px] font-medium text-white transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
