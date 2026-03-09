import React, { useState } from 'react';
import useDiagramStore from '../store/useDiagramStore';
import { Wand2, X, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

// ── Rule-based AI suggestion engine ──
// (Can be swapped for a real Gemini API call via /api/ai/suggest)

const TEMPLATES = {
    'netflix': {
        title: 'Netflix-Style Streaming',
        nodes: [
            { subtype: 'client', label: 'Web / Mobile Client', x: 400, y: 0 },
            { subtype: 'cdn', label: 'CloudFront CDN', x: 400, y: 120 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 240 },
            { subtype: 'gateway', label: 'API Gateway', x: 400, y: 360 },
            { subtype: 'server', label: 'Auth Service', x: 200, y: 480 },
            { subtype: 'server', label: 'Content Service', x: 600, y: 480 },
            { subtype: 'cache', label: 'Redis Cache', x: 400, y: 480 },
            { subtype: 'nosql', label: 'User DB (Cassandra)', x: 200, y: 620 },
            { subtype: 's3', label: 'Video Storage (S3)', x: 600, y: 620 },
            { subtype: 'queue', label: 'Kafka Event Bus', x: 400, y: 620 },
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [5, 8], [5, 9],
        ],
    },
    'uber': {
        title: 'Uber-Style Ride Sharing',
        nodes: [
            { subtype: 'client', label: 'Rider App', x: 200, y: 0 },
            { subtype: 'client', label: 'Driver App', x: 600, y: 0 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 120 },
            { subtype: 'gateway', label: 'API Gateway', x: 400, y: 240 },
            { subtype: 'server', label: 'Trip Service', x: 200, y: 380 },
            { subtype: 'server', label: 'Location Service', x: 600, y: 380 },
            { subtype: 'cache', label: 'Redis (Geo Cache)', x: 400, y: 380 },
            { subtype: 'sql', label: 'Trip DB (Postgres)', x: 200, y: 520 },
            { subtype: 'nosql', label: 'Location DB (Mongo)', x: 600, y: 520 },
            { subtype: 'queue', label: 'RabbitMQ', x: 400, y: 520 },
        ],
        edges: [
            [0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [5, 8], [4, 9], [5, 9],
        ],
    },
    'instagram': {
        title: 'Instagram-Style Social Media',
        nodes: [
            { subtype: 'client', label: 'Mobile App', x: 400, y: 0 },
            { subtype: 'cdn', label: 'CDN (Images)', x: 400, y: 120 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 240 },
            { subtype: 'server', label: 'Feed Service', x: 200, y: 380 },
            { subtype: 'server', label: 'Media Service', x: 600, y: 380 },
            { subtype: 'cache', label: 'Redis (Feed Cache)', x: 400, y: 380 },
            { subtype: 'sql', label: 'User DB', x: 200, y: 520 },
            { subtype: 's3', label: 'Image Store (S3)', x: 600, y: 520 },
            { subtype: 'queue', label: 'Notification Queue', x: 400, y: 520 },
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [3, 6], [4, 7], [3, 8],
        ],
    },
    'chat': {
        title: 'WhatsApp-Style Chat App',
        nodes: [
            { subtype: 'client', label: 'Chat Client', x: 400, y: 0 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 120 },
            { subtype: 'server', label: 'WebSocket Server', x: 400, y: 240 },
            { subtype: 'cache', label: 'Redis Pub/Sub', x: 200, y: 380 },
            { subtype: 'queue', label: 'Message Queue', x: 600, y: 380 },
            { subtype: 'nosql', label: 'Message DB (Cassandra)', x: 400, y: 520 },
            { subtype: 's3', label: 'Media Storage', x: 600, y: 520 },
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [4, 6],
        ],
    },
    'ecommerce': {
        title: 'E-Commerce Platform',
        nodes: [
            { subtype: 'client', label: 'Web Store', x: 400, y: 0 },
            { subtype: 'cdn', label: 'CDN', x: 400, y: 120 },
            { subtype: 'balancer', label: 'Load Balancer', x: 400, y: 240 },
            { subtype: 'gateway', label: 'API Gateway', x: 400, y: 360 },
            { subtype: 'server', label: 'Product Service', x: 150, y: 500 },
            { subtype: 'server', label: 'Order Service', x: 400, y: 500 },
            { subtype: 'server', label: 'Payment Service', x: 650, y: 500 },
            { subtype: 'cache', label: 'Redis Cache', x: 150, y: 640 },
            { subtype: 'sql', label: 'Product DB', x: 150, y: 760 },
            { subtype: 'sql', label: 'Order DB', x: 400, y: 640 },
            { subtype: 'queue', label: 'Event Bus', x: 650, y: 640 },
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [4, 7], [7, 8], [5, 9], [6, 10],
        ],
    },
};

// Smart suggestion based on current nodes
function getSuggestion(nodes) {
    const types = new Set(nodes.map((n) => n.data?.subtype));
    const suggestions = [];

    if (types.has('server') && !types.has('balancer') && nodes.filter(n => n.data?.subtype === 'server').length >= 1) {
        suggestions.push({ text: 'Add a Load Balancer for high availability', component: 'balancer', label: 'Load Balancer' });
    }
    if (types.has('server') && !types.has('cache')) {
        suggestions.push({ text: 'Add Redis Cache to reduce database load by ~90%', component: 'cache', label: 'Redis Cache' });
    }
    if (types.has('server') && !types.has('gateway')) {
        suggestions.push({ text: 'Add an API Gateway for rate limiting & authentication', component: 'gateway', label: 'API Gateway' });
    }
    if ((types.has('sql') || types.has('nosql')) && !types.has('cache')) {
        suggestions.push({ text: 'Your database queries could benefit from a caching layer', component: 'cache', label: 'Redis Cache' });
    }
    if (types.has('server') && !types.has('cdn')) {
        suggestions.push({ text: 'Add a CDN for static asset delivery and lower latency', component: 'cdn', label: 'CDN' });
    }
    if (types.has('server') && !types.has('queue')) {
        suggestions.push({ text: 'Add a Message Queue for async processing and decoupling', component: 'queue', label: 'Message Queue' });
    }

    return suggestions.length > 0 ? suggestions : [{ text: 'Your architecture looks solid! Consider adding monitoring.', component: null }];
}

export default function AiSuggestModal({ open, onClose }) {
    const { nodes, loadDiagram } = useDiagramStore();
    const [tab, setTab] = useState('suggest'); // 'suggest' | 'template' | 'nlp'
    const [nlpInput, setNlpInput] = useState('');
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const suggestions = getSuggestion(nodes);

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

    // NLP — parse description to diagram
    const handleNlp = () => {
        setLoading(true);
        setTimeout(() => {
            const input = nlpInput.toLowerCase();
            let key = 'netflix';
            if (input.includes('chat') || input.includes('whatsapp') || input.includes('message')) key = 'chat';
            else if (input.includes('uber') || input.includes('ride') || input.includes('taxi')) key = 'uber';
            else if (input.includes('instagram') || input.includes('social') || input.includes('photo')) key = 'instagram';
            else if (input.includes('shop') || input.includes('ecommerce') || input.includes('store') || input.includes('payment')) key = 'ecommerce';
            else if (input.includes('video') || input.includes('stream') || input.includes('netflix') || input.includes('youtube')) key = 'netflix';
            applyTemplate(key);
            setLoading(false);
        }, 800);
    };

    const addSuggested = (sug) => {
        if (!sug.component) return;
        const maxY = Math.max(...nodes.map(n => n.position.y), 0);
        useDiagramStore.getState().addNode({
            position: { x: 400, y: maxY + 140 },
            data: { subtype: sug.component, label: sug.label, status: 'healthy' },
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[560px] max-h-[80vh] bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={18} className="text-purple-400" />
                        <h2 className="font-semibold text-lg text-white">AI Architecture Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700/40">
                    {[
                        { key: 'suggest', label: 'Smart Suggestions' },
                        { key: 'template', label: 'Templates' },
                        { key: 'nlp', label: 'Describe → Build' },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${tab === t.key ? 'text-white border-b-2 border-indigo-500 bg-slate-700/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[50vh]">
                    {/* Smart Suggestions */}
                    {tab === 'suggest' && (
                        <div className="space-y-2">
                            {suggestions.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <Wand2 size={14} className="text-indigo-400 shrink-0" />
                                        <span className="text-[13px] text-slate-300">{s.text}</span>
                                    </div>
                                    {s.component && (
                                        <button onClick={() => addSuggested(s)} className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-medium transition-colors shrink-0">
                                            Add <ArrowRight size={11} />
                                        </button>
                                    )}
                                </div>
                            ))}
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
                                    <div className="text-[14px] font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">{tmpl.title}</div>
                                    <div className="text-[11px] text-slate-500">{tmpl.nodes.length} nodes · {tmpl.edges.length} connections</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Natural Language → Diagram */}
                    {tab === 'nlp' && (
                        <div className="space-y-4">
                            <p className="text-[13px] text-slate-400">Describe the system you want to build, and AI will generate the architecture diagram.</p>
                            <textarea
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none h-28 transition-colors"
                                placeholder="e.g. Build me a video streaming platform like Netflix with a CDN, microservices, and a recommendation engine..."
                                value={nlpInput}
                                onChange={(e) => setNlpInput(e.target.value)}
                            />
                            <button
                                onClick={handleNlp}
                                disabled={!nlpInput.trim() || loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
                            >
                                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                {loading ? 'Generating...' : 'Generate Architecture'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
