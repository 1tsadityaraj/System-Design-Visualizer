import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ICON_MAP } from '../icons/ServiceIcons';

// Color palettes per category
const THEMES = {
    // Compute
    server: { accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.35)', glow: '0 0 20px rgba(59,130,246,0.15)' },
    lambda: { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.35)', glow: '0 0 20px rgba(139,92,246,0.15)' },
    // Storage
    sql: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)', glow: '0 0 20px rgba(245,158,11,0.15)' },
    nosql: { accent: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.35)', glow: '0 0 20px rgba(249,115,22,0.15)' },
    s3: { accent: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)', glow: '0 0 20px rgba(239,68,68,0.15)' },
    // Networking
    balancer: { accent: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)', glow: '0 0 20px rgba(16,185,129,0.15)' },
    gateway: { accent: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.35)', glow: '0 0 20px rgba(6,182,212,0.15)' },
    cdn: { accent: '#14b8a6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.35)', glow: '0 0 20px rgba(20,184,166,0.15)' },
    // Misc
    cache: { accent: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.35)', glow: '0 0 20px rgba(234,179,8,0.15)' },
    queue: { accent: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.35)', glow: '0 0 20px rgba(236,72,153,0.15)' },
    client: { accent: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.35)', glow: '0 0 20px rgba(148,163,184,0.10)' },
};

const DEFAULT_THEME = THEMES.server;

const handleStyle = (accent) => ({
    width: 9,
    height: 9,
    background: '#1e293b',
    border: `2px solid ${accent}`,
    transition: 'all 0.15s ease',
});

function SystemNode({ data, selected }) {
    const { subtype = 'server', label = 'Node', status = 'healthy' } = data;
    const theme = THEMES[subtype] || DEFAULT_THEME;
    const IconComponent = ICON_MAP[subtype] || ICON_MAP.server;

    const statusColors = {
        healthy: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        offline: '#64748b',
    };

    return (
        <div
            className="relative group"
            style={{
                minWidth: 160,
                background: theme.bg,
                border: `1.5px solid ${selected ? '#ffffff' : theme.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                boxShadow: selected
                    ? `0 0 0 2px rgba(255,255,255,0.1), ${theme.glow}`
                    : theme.glow,
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* ── 4 Connection Handles ── */}
            <Handle type="target" position={Position.Top} id="top" style={handleStyle(theme.accent)} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle(theme.accent)} />
            <Handle type="target" position={Position.Left} id="left" style={handleStyle(theme.accent)} />
            <Handle type="source" position={Position.Right} id="right" style={handleStyle(theme.accent)} />

            {/* ── Status Indicator (pulsing dot) ── */}
            <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                <span
                    className="absolute w-3 h-3 rounded-full animate-ping opacity-40"
                    style={{ backgroundColor: statusColors[status] }}
                />
                <span
                    className="relative w-2.5 h-2.5 rounded-full border border-slate-900"
                    style={{ backgroundColor: statusColors[status] }}
                />
            </div>

            {/* ── Node Body ── */}
            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                        background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}11)`,
                        border: `1px solid ${theme.accent}44`,
                    }}
                >
                    <IconComponent className="w-5 h-5" style={{ color: theme.accent }} />
                </div>

                <div className="flex flex-col min-w-0">
                    <span
                        className="font-semibold text-[13px] leading-tight text-white truncate"
                        style={{ maxWidth: 120 }}
                    >
                        {label}
                    </span>
                    <span
                        className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                        style={{ color: theme.accent, opacity: 0.7 }}
                    >
                        {subtype}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default memo(SystemNode);
