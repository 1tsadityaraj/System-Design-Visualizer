import React, { useState } from 'react';
import useDiagramStore from '../store/useDiagramStore';
import { Wand2, X, Sparkles, ArrowRight, Loader2, Zap, Layout, MessageSquare } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5005';

// ── Pre-built templates (instant, no API call) ──
const TEMPLATES = {
    netflix: {
        title: 'Netflix-Style Streaming',
        nodes: [
            { subtype: 'client', label: 'Web / Mobile Client', x: 400, y: 0 },
            { subtype: 'cdn', label: 'CloudFront CDN', x: 400, y: 140 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 280 },
            { subtype: 'gateway', label: 'API Gateway', x: 400, y: 420 },
            { subtype: 'server', label: 'Auth Service', x: 200, y: 560 },
            { subtype: 'server', label: 'Content Service', x: 600, y: 560 },
            { subtype: 'cache', label: 'Redis Cache', x: 400, y: 560 },
            { subtype: 'nosql', label: 'User DB (Cassandra)', x: 200, y: 700 },
            { subtype: 's3', label: 'Video Storage (S3)', x: 600, y: 700 },
            { subtype: 'queue', label: 'Kafka Event Bus', x: 400, y: 700 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [5, 8], [5, 9]],
    },
    uber: {
        title: 'Uber-Style Ride Sharing',
        nodes: [
            { subtype: 'client', label: 'Rider App', x: 200, y: 0 },
            { subtype: 'client', label: 'Driver App', x: 600, y: 0 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 140 },
            { subtype: 'gateway', label: 'API Gateway', x: 400, y: 280 },
            { subtype: 'server', label: 'Trip Service', x: 200, y: 420 },
            { subtype: 'server', label: 'Location Service', x: 600, y: 420 },
            { subtype: 'cache', label: 'Redis (Geo Cache)', x: 400, y: 420 },
            { subtype: 'sql', label: 'Trip DB (Postgres)', x: 200, y: 560 },
            { subtype: 'nosql', label: 'Location DB (Mongo)', x: 600, y: 560 },
            { subtype: 'queue', label: 'RabbitMQ', x: 400, y: 560 },
        ],
        edges: [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [5, 8], [4, 9], [5, 9]],
    },
    instagram: {
        title: 'Instagram-Style Social Media',
        nodes: [
            { subtype: 'client', label: 'Mobile App', x: 400, y: 0 },
            { subtype: 'cdn', label: 'CDN (Images)', x: 400, y: 140 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 280 },
            { subtype: 'server', label: 'Feed Service', x: 200, y: 420 },
            { subtype: 'server', label: 'Media Service', x: 600, y: 420 },
            { subtype: 'cache', label: 'Redis (Feed Cache)', x: 400, y: 420 },
            { subtype: 'sql', label: 'User DB', x: 200, y: 560 },
            { subtype: 's3', label: 'Image Store (S3)', x: 600, y: 560 },
            { subtype: 'queue', label: 'Notification Queue', x: 400, y: 560 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [3, 6], [4, 7], [3, 8]],
    },
    chat: {
        title: 'WhatsApp-Style Chat App',
        nodes: [
            { subtype: 'client', label: 'Chat Client', x: 400, y: 0 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 140 },
            { subtype: 'server', label: 'WebSocket Server', x: 400, y: 280 },
            { subtype: 'cache', label: 'Redis Pub/Sub', x: 200, y: 420 },
            { subtype: 'queue', label: 'Message Queue', x: 600, y: 420 },
            { subtype: 'nosql', label: 'Message DB (Cassandra)', x: 400, y: 560 },
            { subtype: 's3', label: 'Media Storage', x: 600, y: 560 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6]],
    },
    ecommerce: {
        title: 'E-Commerce Platform',
        nodes: [
            { subtype: 'client', label: 'Web Store', x: 400, y: 0 },
            { subtype: 'cdn', label: 'CDN', x: 400, y: 140 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 280 },
            { subtype: 'gateway', label: 'API Gateway', x: 400, y: 420 },
            { subtype: 'server', label: 'Product Service', x: 150, y: 560 },
            { subtype: 'server', label: 'Order Service', x: 400, y: 560 },
            { subtype: 'server', label: 'Payment Service', x: 650, y: 560 },
            { subtype: 'cache', label: 'Redis Cache', x: 150, y: 700 },
            { subtype: 'sql', label: 'Product DB', x: 150, y: 840 },
            { subtype: 'sql', label: 'Order DB', x: 400, y: 700 },
            { subtype: 'queue', label: 'Event Bus', x: 650, y: 700 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [7, 8], [5, 9], [6, 10]],
    },
};

export default function AiSuggestModal({ open, onClose }) {
    const { nodes, loadDiagram } = useDiagramStore();
    const [tab, setTab] = useState('suggest');
    const [nlpInput, setNlpInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [aiSource, setAiSource] = useState('');
    const [error, setError] = useState('');

    if (!open) return null;

    // ── Call backend API for smart suggestions ──
    const fetchSuggestions = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/ai/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodes }),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            setSuggestions(data.suggestions || []);
            setAiSource(data.source || 'rules');
        } catch (err) {
            console.warn('API call failed, using client-side fallback:', err.message);
            setError('Backend unavailable — showing client-side analysis');
            // Client-side fallback
            setSuggestions(clientFallbackSuggestions(nodes));
            setAiSource('client');
        }
        setLoading(false);
    };

    // Load suggestions when switching to suggest tab
    const handleTabChange = (key) => {
        setTab(key);
        if (key === 'suggest' && suggestions.length === 0) {
            fetchSuggestions();
        }
    };

    // Initial load
    if (tab === 'suggest' && suggestions.length === 0 && !loading) {
        fetchSuggestions();
    }

    // ── Apply template ──
    const applyTemplate = (key) => {
        const tmpl = TEMPLATES[key];
        if (!tmpl) return;
        const newNodes = tmpl.nodes.map((n, i) => ({
            id: `tmpl-${i}`,
            type: 'systemNode',
            position: { x: n.x, y: n.y },
            data: { subtype: n.subtype, label: n.label, status: 'healthy' },
        }));
        const newEdges = tmpl.edges.map(([s, t], i) => ({
            id: `tmpl-e-${i}`,
            source: `tmpl-${s}`,
            target: `tmpl-${t}`,
            type: 'smoothstep',
            style: { stroke: '#64748b', strokeWidth: 2 },
        }));
        loadDiagram({ nodes: newNodes, edges: newEdges, title: tmpl.title });
        onClose();
    };

    // ── NLP → Diagram via backend API ──
    const handleNlp = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/ai/nlp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: nlpInput }),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            const diagram = data.diagram;
            if (diagram && diagram.nodes) {
                loadDiagram({
                    nodes: diagram.nodes,
                    edges: diagram.edges || [],
                    title: diagram.title || 'AI-Generated Architecture',
                });
                setAiSource(data.source || 'gemini');
                onClose();
            }
        } catch (err) {
            console.warn('NLP API failed:', err.message);
            setError('Backend unavailable — try using a template instead');
        }
        setLoading(false);
    };

    // ── Add suggested component ──
    const addSuggested = (sug) => {
        if (!sug.component) return;
        const maxY = Math.max(...nodes.map((n) => n.position.y), 0);
        useDiagramStore.getState().addNode({
            position: { x: 400, y: maxY + 140 },
            data: { subtype: sug.component, label: sug.label, status: 'healthy' },
        });
        onClose(); // Automatically close modal so user can connect the new node
    };

    const PRIORITY_COLORS = {
        critical: 'text-red-400',
        high: 'text-orange-400',
        medium: 'text-blue-400',
        low: 'text-slate-400',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[580px] max-h-[80vh] bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={18} className="text-purple-400" />
                        <h2 className="font-semibold text-lg text-white">AI Architecture Assistant</h2>
                        {aiSource && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${aiSource === 'gemini' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-slate-400 border-slate-600/40 bg-slate-700/30'}`}>
                                {aiSource === 'gemini' ? '✦ Gemini' : aiSource === 'rules' ? 'Rules Engine' : 'Client'}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700/40">
                    {[
                        { key: 'suggest', label: 'Smart Suggestions', icon: Zap },
                        { key: 'template', label: 'Templates', icon: Layout },
                        { key: 'nlp', label: 'Describe → Build', icon: MessageSquare },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => handleTabChange(t.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors ${tab === t.key
                                ? 'text-white border-b-2 border-indigo-500 bg-slate-700/20'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <t.icon size={13} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-5 mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[12px] text-amber-400">
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[50vh]">
                    {/* Smart Suggestions */}
                    {tab === 'suggest' && (
                        <div className="space-y-2">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                                    <span className="text-[13px] text-slate-400">Analyzing your architecture...</span>
                                </div>
                            ) : suggestions.length > 0 ? (
                                suggestions.map((s, i) => (
                                    <div key={i} className="flex items-start justify-between gap-3 p-3.5 bg-slate-900/40 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            <Wand2 size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[13px] font-semibold text-white">{s.label}</span>
                                                    {s.priority && (
                                                        <span className={`text-[9px] font-bold uppercase ${PRIORITY_COLORS[s.priority] || 'text-slate-500'}`}>
                                                            {s.priority}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[12px] text-slate-400 leading-relaxed">{s.reason}</span>
                                            </div>
                                        </div>
                                        {s.component && (
                                            <button
                                                onClick={() => addSuggested(s)}
                                                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-medium transition-colors shrink-0"
                                            >
                                                Add <ArrowRight size={11} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500 text-[13px]">No suggestions available</div>
                            )}
                            {!loading && (
                                <button
                                    onClick={fetchSuggestions}
                                    className="w-full mt-2 py-2 text-[12px] text-slate-500 hover:text-slate-300 border border-slate-700/30 hover:border-slate-600 rounded-lg transition-colors"
                                >
                                    ↻ Refresh Suggestions
                                </button>
                            )}
                        </div>
                    )}

                    {/* Templates */}
                    {tab === 'template' && (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                                <button
                                    key={key}
                                    onClick={() => applyTemplate(key)}
                                    className="p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-indigo-500/40 text-left transition-all hover:bg-slate-800/60 group"
                                >
                                    <div className="text-[14px] font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                        {tmpl.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {tmpl.nodes.length} nodes · {tmpl.edges.length} connections
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Natural Language → Diagram */}
                    {tab === 'nlp' && (
                        <div className="space-y-4">
                            <p className="text-[13px] text-slate-400">
                                Describe the system you want to build. The AI will generate a production-grade architecture diagram.
                            </p>
                            <textarea
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none h-28 transition-colors"
                                placeholder="e.g. Build me a video streaming platform like Netflix with a CDN, microservices, and a recommendation engine..."
                                value={nlpInput}
                                onChange={(e) => setNlpInput(e.target.value)}
                            />
                            <button
                                onClick={handleNlp}
                                disabled={!nlpInput.trim() || loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-purple-500/20"
                            >
                                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                {loading ? 'Generating with AI...' : 'Generate Architecture'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Client-side fallback when backend is unreachable ──
function clientFallbackSuggestions(nodes) {
    const types = new Set(nodes.map((n) => n.data?.subtype));
    const suggestions = [];

    if (types.has('server') && !types.has('balancer')) {
        suggestions.push({ type: 'add', component: 'balancer', label: 'Load Balancer', reason: 'Add a Load Balancer for high availability', priority: 'high' });
    }
    if (types.has('server') && !types.has('cache')) {
        suggestions.push({ type: 'add', component: 'cache', label: 'Redis Cache', reason: 'Add Redis Cache to reduce database load by ~90%', priority: 'high' });
    }
    if (types.has('server') && !types.has('gateway')) {
        suggestions.push({ type: 'add', component: 'gateway', label: 'API Gateway', reason: 'Add an API Gateway for rate limiting & authentication', priority: 'medium' });
    }
    if (types.has('server') && !types.has('cdn')) {
        suggestions.push({ type: 'add', component: 'cdn', label: 'CDN', reason: 'Add a CDN for static asset delivery and lower latency', priority: 'medium' });
    }
    if (types.has('server') && !types.has('queue')) {
        suggestions.push({ type: 'add', component: 'queue', label: 'Message Queue', reason: 'Add a Message Queue for async processing', priority: 'low' });
    }

    return suggestions.length > 0 ? suggestions : [{ type: 'info', component: null, label: 'Architecture Looks Good', reason: 'Consider adding monitoring and alerting.', priority: 'low' }];
}
