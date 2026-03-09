import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import {
    ServerIcon, LambdaIcon, SqlIcon, NoSqlIcon, S3Icon,
    BalancerIcon, GatewayIcon, CdnIcon, CacheIcon, QueueIcon, ClientIcon,
} from './icons/ServiceIcons';

const CATEGORIES = [
    {
        name: 'Clients',
        items: [
            { type: 'client', subtype: 'client', label: 'Client App', icon: ClientIcon, accent: '#94a3b8' },
        ],
    },
    {
        name: 'Compute',
        items: [
            { type: 'compute', subtype: 'server', label: 'API Server', icon: ServerIcon, accent: '#3b82f6' },
            { type: 'compute', subtype: 'lambda', label: 'Lambda / FaaS', icon: LambdaIcon, accent: '#8b5cf6' },
        ],
    },
    {
        name: 'Storage',
        items: [
            { type: 'storage', subtype: 'sql', label: 'SQL Database', icon: SqlIcon, accent: '#f59e0b' },
            { type: 'storage', subtype: 'nosql', label: 'NoSQL / MongoDB', icon: NoSqlIcon, accent: '#f97316' },
            { type: 'storage', subtype: 's3', label: 'S3 / Object Store', icon: S3Icon, accent: '#ef4444' },
        ],
    },
    {
        name: 'Networking',
        items: [
            { type: 'networking', subtype: 'balancer', label: 'Load Balancer', icon: BalancerIcon, accent: '#10b981' },
            { type: 'networking', subtype: 'gateway', label: 'API Gateway', icon: GatewayIcon, accent: '#06b6d4' },
            { type: 'networking', subtype: 'cdn', label: 'CDN', icon: CdnIcon, accent: '#14b8a6' },
        ],
    },
    {
        name: 'Middleware',
        items: [
            { type: 'middleware', subtype: 'cache', label: 'Redis Cache', icon: CacheIcon, accent: '#eab308' },
            { type: 'middleware', subtype: 'queue', label: 'Message Queue', icon: QueueIcon, accent: '#ec4899' },
        ],
    },
];

export default function Sidebar() {
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState({});

    const toggleSection = (name) =>
        setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

    const onDragStart = (event, item) => {
        const payload = {
            subtype: item.subtype,
            label: item.label,
            color: item.accent,
            type: item.type,
        };
        event.dataTransfer.setData('application/sysdesign', JSON.stringify(payload));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-[252px] bg-slate-800/80 backdrop-blur-sm border-r border-slate-700/60 flex flex-col h-full text-white z-10 shrink-0">
            {/* Search */}
            <div className="p-3 border-b border-slate-700/60">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                    <input
                        type="text"
                        placeholder="Search components..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-700/50 text-[13px] rounded-lg py-2 pl-8 pr-3 text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Component List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {CATEGORIES.map((cat) => {
                    const filtered = cat.items.filter((i) =>
                        i.label.toLowerCase().includes(search.toLowerCase()) ||
                        i.subtype.toLowerCase().includes(search.toLowerCase()),
                    );
                    if (filtered.length === 0) return null;
                    const isOpen = !collapsed[cat.name];

                    return (
                        <div key={cat.name} className="mb-2">
                            <button
                                onClick={() => toggleSection(cat.name)}
                                className="w-full flex items-center justify-between py-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {cat.name}
                                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>

                            {isOpen && (
                                <div className="flex flex-col gap-1 mt-0.5">
                                    {filtered.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <div
                                                key={item.subtype}
                                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-slate-600/50 hover:bg-slate-700/40 group"
                                                draggable
                                                onDragStart={(e) => onDragStart(e, item)}
                                            >
                                                <div
                                                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                                    style={{
                                                        background: `${item.accent}15`,
                                                        border: `1px solid ${item.accent}30`,
                                                    }}
                                                >
                                                    <Icon className="w-4 h-4" style={{ color: item.accent }} />
                                                </div>
                                                <span className="text-[13px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors truncate">
                                                    {item.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Keyboard Shortcuts hint */}
            <div className="p-3 border-t border-slate-700/60 text-[10px] text-slate-600 space-y-0.5">
                <div><kbd className="px-1 py-0.5 bg-slate-900 rounded text-[9px] border border-slate-700">⌘Z</kbd> Undo · <kbd className="px-1 py-0.5 bg-slate-900 rounded text-[9px] border border-slate-700">Del</kbd> Delete</div>
                <div><kbd className="px-1 py-0.5 bg-slate-900 rounded text-[9px] border border-slate-700">⌘⇧Z</kbd> Redo · Drag to canvas</div>
            </div>
        </aside>
    );
}
