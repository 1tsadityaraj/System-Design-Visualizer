import React, { useState } from 'react';
import useDiagramStore from '../store/useDiagramStore';
import { estimateCapacity } from '../utils/capacityEstimator';
import { Settings, FileText, TrendingUp, Users, ChevronDown, ChevronRight, Trash2, Shield } from 'lucide-react';
import { ICON_MAP } from './icons/ServiceIcons';
import SecurityPanel from './overlays/SecurityPanel';

export default function Inspector() {
    const selectedNode = useDiagramStore((s) => s.selectedNode);
    const updateNodeData = useDiagramStore((s) => s.updateNodeData);
    const deleteSelected = useDiagramStore((s) => s.deleteSelected);
    const securityMode = useDiagramStore((s) => s.securityMode);
    const [userCount, setUserCount] = useState(100000);
    const [showConfig, setShowConfig] = useState(true);
    const [showCapacity, setShowCapacity] = useState(true);
    const [showDocs, setShowDocs] = useState(false);
    const [activeTab, setActiveTab] = useState('inspector'); // 'inspector' | 'security'

    // Security mode shows the security panel in the sidebar
    if (securityMode && (!selectedNode || activeTab === 'security')) {
        return (
            <aside className="w-[280px] bg-slate-800/80 backdrop-blur-sm border-l border-slate-700/60 flex flex-col h-full text-white z-10 shrink-0">
                {/* Tabs */}
                <div className="flex border-b border-slate-700/60">
                    <button
                        onClick={() => setActiveTab('inspector')}
                        className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${activeTab === 'inspector'
                                ? 'text-white border-b-2 border-blue-500 bg-slate-700/20'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Inspector
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'security'
                                ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/5'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Shield size={11} /> Security
                    </button>
                </div>

                {activeTab === 'security' ? (
                    <SecurityPanel />
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-700/60">
                            <h2 className="font-semibold text-sm text-slate-500">Inspector</h2>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 bg-slate-900/60 rounded-xl flex items-center justify-center text-slate-600 mb-3 border border-slate-700/50">
                                <Settings size={20} />
                            </div>
                            <p className="text-[13px] text-slate-500 leading-relaxed">
                                Click a node to inspect its properties, configure resources, and estimate capacity.
                            </p>
                        </div>
                    </div>
                )}
            </aside>
        );
    }

    if (!selectedNode) {
        return (
            <aside className="w-[280px] bg-slate-800/80 backdrop-blur-sm border-l border-slate-700/60 flex flex-col h-full text-white z-10 shrink-0">
                <div className="px-4 py-3 border-b border-slate-700/60">
                    <h2 className="font-semibold text-sm text-slate-500">Inspector</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-slate-900/60 rounded-xl flex items-center justify-center text-slate-600 mb-3 border border-slate-700/50">
                        <Settings size={20} />
                    </div>
                    <p className="text-[13px] text-slate-500 leading-relaxed">
                        Click a node to inspect its properties, configure resources, and estimate capacity.
                    </p>
                </div>
            </aside>
        );
    }

    const { data, id } = selectedNode;
    const estimate = estimateCapacity(data.subtype, userCount);
    const Icon = ICON_MAP[data.subtype] || ICON_MAP.server;

    const handleChange = (key, value) => updateNodeData(id, { [key]: value });

    const Section = ({ icon: Ic, title, open, toggle, children }) => (
        <div className="border-b border-slate-700/40">
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <Ic size={11} />
                    {title}
                </span>
                {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {open && <div className="px-4 pb-3 space-y-2.5">{children}</div>}
        </div>
    );

    const Field = ({ label, children }) => (
        <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );

    const inputCls = 'w-full bg-slate-900/60 border border-slate-700/50 rounded-md px-2.5 py-1.5 text-[13px] text-white focus:outline-none focus:border-blue-500/50 transition-colors';

    return (
        <aside className="w-[280px] bg-slate-800/80 backdrop-blur-sm border-l border-slate-700/60 flex flex-col h-full text-white z-10 shrink-0">
            {/* Tabs when security mode */}
            {securityMode && (
                <div className="flex border-b border-slate-700/60">
                    <button
                        onClick={() => setActiveTab('inspector')}
                        className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${activeTab === 'inspector'
                                ? 'text-white border-b-2 border-blue-500 bg-slate-700/20'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Inspector
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'security'
                                ? 'text-violet-400 border-b-2 border-violet-500'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Shield size={11} /> Security
                    </button>
                </div>
            )}

            {activeTab === 'security' && securityMode ? (
                <SecurityPanel />
            ) : (
                <>
                    {/* Node Header */}
                    <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900/50 border border-slate-700/50 shrink-0">
                            <Icon className="w-4 h-4" style={{ color: data.color || '#3b82f6' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{data.label}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{data.subtype} · {id.slice(0, 12)}</div>
                        </div>
                        <button
                            onClick={deleteSelected}
                            className="p-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete Node"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* Configuration */}
                        <Section icon={Settings} title="Configuration" open={showConfig} toggle={() => setShowConfig(!showConfig)}>
                            <Field label="Label">
                                <input type="text" className={inputCls} value={data.label || ''} onChange={(e) => handleChange('label', e.target.value)} />
                            </Field>
                            <Field label="Status">
                                <select className={`${inputCls} appearance-none cursor-pointer`} value={data.status || 'healthy'} onChange={(e) => handleChange('status', e.target.value)}>
                                    <option value="healthy">🟢 Healthy</option>
                                    <option value="warning">🟡 Warning</option>
                                    <option value="error">🔴 Error / Down</option>
                                    <option value="offline">⚫ Offline</option>
                                </select>
                            </Field>
                            <Field label="Region">
                                <select className={`${inputCls} appearance-none cursor-pointer`} value={data.region || 'us-east-1'} onChange={(e) => handleChange('region', e.target.value)}>
                                    <option value="us-east-1">US East (N. Virginia)</option>
                                    <option value="us-west-2">US West (Oregon)</option>
                                    <option value="eu-central-1">EU (Frankfurt)</option>
                                    <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                                    <option value="global">Global</option>
                                </select>
                            </Field>
                            <Field label="Instance / Size">
                                <select className={`${inputCls} appearance-none cursor-pointer`} value={data.size || 't3.micro'} onChange={(e) => handleChange('size', e.target.value)}>
                                    <option value="t3.micro">t3.micro (Dev)</option>
                                    <option value="t3.small">t3.small</option>
                                    <option value="t3.medium">t3.medium</option>
                                    <option value="m5.large">m5.large (Prod)</option>
                                    <option value="m5.xlarge">m5.xlarge</option>
                                    <option value="c5.large">c5.large (Compute)</option>
                                    <option value="c5.xlarge">c5.xlarge</option>
                                    <option value="c5.2xlarge">c5.2xlarge (Compute)</option>
                                    <option value="r5.large">r5.large (Memory)</option>
                                    <option value="r5.xlarge">r5.xlarge (Memory)</option>
                                    <option value="serverless">Serverless</option>
                                </select>
                            </Field>
                        </Section>

                        {/* Capacity Estimator */}
                        <Section icon={TrendingUp} title="Capacity Estimator" open={showCapacity} toggle={() => setShowCapacity(!showCapacity)}>
                            <Field label={<span className="flex items-center gap-1"><Users size={10} />Total Users</span>}>
                                <select className={`${inputCls} appearance-none cursor-pointer`} value={userCount} onChange={(e) => setUserCount(Number(e.target.value))}>
                                    <option value={1000}>1,000 users</option>
                                    <option value={10000}>10,000 users</option>
                                    <option value={100000}>100,000 users</option>
                                    <option value={500000}>500,000 users</option>
                                    <option value={1000000}>1,000,000 users</option>
                                    <option value={10000000}>10,000,000 users</option>
                                </select>
                            </Field>
                            <div className="bg-slate-900/50 rounded-lg border border-slate-700/40 overflow-hidden">
                                <div className="px-3 py-1.5 border-b border-slate-700/30 bg-blue-500/5">
                                    <span className="text-[11px] font-semibold text-blue-400">{estimate.title}</span>
                                </div>
                                <div className="divide-y divide-slate-700/20">
                                    {estimate.metrics.map((m, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-1.5">
                                            <span className="text-[11px] text-slate-400">{m.label}</span>
                                            <span className="text-[12px] font-mono font-semibold text-white">
                                                {m.value} <span className="text-slate-500 text-[10px]">{m.unit}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Section>

                        {/* Documentation */}
                        <Section icon={FileText} title="Documentation" open={showDocs} toggle={() => setShowDocs(!showDocs)}>
                            <textarea
                                className={`${inputCls} resize-none h-28 leading-relaxed font-mono text-[11px]`}
                                placeholder="// Design decisions, scaling notes..."
                                value={data.notes || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                            />
                        </Section>
                    </div>
                </>
            )}
        </aside>
    );
}
