// ─────────────────────────────────────────────────────────────────
// Zustand Store — Diagram State with Undo/Redo History Patches
// ─────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { v4 as uuid } from 'uuid';

const MAX_HISTORY = 40;

// ── Architecture Linter Rules ─────────────────────────────────
function runLinter(nodes, edges) {
    const warnings = [];
    const hasType = (sub) => nodes.some((n) => n.data.subtype === sub);
    const hasDb = hasType('sql') || hasType('nosql');
    const hasGw = hasType('gateway');
    const hasLb = hasType('balancer');
    const hasServer = hasType('server') || hasType('lambda');
    const hasCdn = hasType('cdn');
    const hasCache = nodes.some(
        (n) =>
            n.data.label?.toLowerCase().includes('cache') ||
            n.data.label?.toLowerCase().includes('redis'),
    );
    const serverCount = nodes.filter((n) => n.data.subtype === 'server').length;

    // Check if any DB is directly connected to a frontend-type node without API layer
    if (hasDb && !hasGw && hasServer) {
        warnings.push({
            id: 'no-gateway',
            severity: 'warning',
            title: 'Missing API Gateway',
            message:
                'Your database is accessible through a server without an API Gateway. Add an API Gateway for security, rate limiting, and request validation.',
        });
    }
    if (serverCount > 1 && !hasLb) {
        warnings.push({
            id: 'no-lb',
            severity: 'error',
            title: 'No Load Balancer',
            message: `You have ${serverCount} servers but no Load Balancer. Without one, traffic cannot be distributed evenly.`,
        });
    }
    if (serverCount === 1 && hasDb) {
        warnings.push({
            id: 'spof',
            severity: 'info',
            title: 'Single Point of Failure',
            message:
                'Only one server instance detected. Consider adding replicas with a Load Balancer for high availability.',
        });
    }
    if (hasServer && !hasCdn && nodes.length > 3) {
        warnings.push({
            id: 'no-cdn',
            severity: 'info',
            title: 'Consider Adding a CDN',
            message:
                'For production, a CDN reduces latency for static assets and offloads traffic from your origin servers.',
        });
    }
    if (hasDb && hasServer && !hasCache && nodes.length > 4) {
        warnings.push({
            id: 'no-cache',
            severity: 'warning',
            title: 'No Cache Layer',
            message:
                'Adding a cache (e.g. Redis) between your servers and database can reduce read latency by up to 90%.',
        });
    }

    // Orphaned / disconnected nodes
    const connected = new Set();
    edges.forEach((e) => {
        connected.add(e.source);
        connected.add(e.target);
    });
    const orphans = nodes.filter((n) => !connected.has(n.id));
    if (orphans.length > 0 && nodes.length > 1) {
        warnings.push({
            id: 'disconnected',
            severity: 'warning',
            title: `${orphans.length} Orphaned Node${orphans.length > 1 ? 's' : ''}`,
            message: `${orphans.map((n) => n.data.label).join(', ')} ha${orphans.length > 1 ? 've' : 's'} no connections. Connect them to show data flow.`,
        });
    }
    return warnings;
}

// ── Store ─────────────────────────────────────────────────────
const useDiagramStore = create((set, get) => ({
    // Graph state
    nodes: [],
    edges: [],
    title: 'Untitled Architecture',

    // Selection
    selectedNode: null,

    // Linter
    warnings: [],

    // Animation
    isAnimating: false,

    // Snapshots / Versioning
    snapshots: [],

    // Undo / Redo (history patches)
    past: [],
    future: [],

    // ── History helpers ──
    _pushHistory: () => {
        const { nodes, edges, past } = get();
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
        };
        const newPast = [...past, snapshot];
        if (newPast.length > MAX_HISTORY) newPast.shift();
        set({ past: newPast, future: [] });
    },

    undo: () => {
        const { past, nodes, edges } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        set({
            past: past.slice(0, -1),
            future: [
                ...get().future,
                { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) },
            ],
            nodes: prev.nodes,
            edges: prev.edges,
            selectedNode: null,
            warnings: runLinter(prev.nodes, prev.edges),
        });
    },

    redo: () => {
        const { future, nodes, edges } = get();
        if (future.length === 0) return;
        const next = future[future.length - 1];
        set({
            future: future.slice(0, -1),
            past: [
                ...get().past,
                { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) },
            ],
            nodes: next.nodes,
            edges: next.edges,
            selectedNode: null,
            warnings: runLinter(next.nodes, next.edges),
        });
    },

    // ── Node / Edge mutations ──
    onNodesChange: (changes) => {
        const { nodes } = get();
        const updated = applyNodeChanges(changes, nodes);
        const structural = changes.some((c) => c.type === 'add' || c.type === 'remove');
        set({
            nodes: updated,
            ...(structural ? { warnings: runLinter(updated, get().edges) } : {}),
        });
    },

    onEdgesChange: (changes) => {
        const { edges, nodes } = get();
        const updated = applyEdgeChanges(changes, edges);
        set({ edges: updated, warnings: runLinter(nodes, updated) });
    },

    onConnect: (connection) => {
        get()._pushHistory();
        const { edges, nodes } = get();
        const edge = {
            ...connection,
            id: `e-${uuid()}`,
            type: 'smoothstep',
            animated: get().isAnimating,
            style: {
                stroke: get().isAnimating ? '#22d3ee' : '#64748b',
                strokeWidth: 2,
            },
        };
        const updated = addEdge(edge, edges);
        set({ edges: updated, warnings: runLinter(nodes, updated) });
    },

    addNode: (nodeData) => {
        get()._pushHistory();
        const { nodes, edges } = get();
        const newNode = {
            id: `node-${uuid()}`,
            type: 'systemNode',
            position: nodeData.position,
            data: { ...nodeData.data, status: 'healthy' },
        };
        const updated = [...nodes, newNode];
        set({ nodes: updated, warnings: runLinter(updated, edges) });
    },

    setSelectedNode: (node) => set({ selectedNode: node }),

    updateNodeData: (id, data) => {
        const { nodes, selectedNode } = get();
        const updated = nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
        );
        set({
            nodes: updated,
            selectedNode:
                selectedNode?.id === id
                    ? { ...selectedNode, data: { ...selectedNode.data, ...data } }
                    : selectedNode,
        });
    },

    deleteSelected: () => {
        get()._pushHistory();
        const { nodes, edges, selectedNode } = get();
        const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
        if (selectedIds.length === 0 && selectedNode) selectedIds.push(selectedNode.id);
        const newNodes = nodes.filter((n) => !selectedIds.includes(n.id));
        const newEdges = edges.filter(
            (e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target),
        );
        set({
            nodes: newNodes,
            edges: newEdges,
            selectedNode: null,
            warnings: runLinter(newNodes, newEdges),
        });
    },

    // ── Diagram load ──
    loadDiagram: (diagram) => {
        get()._pushHistory();
        set({
            nodes: diagram.nodes || [],
            edges: diagram.edges || [],
            title: diagram.title || 'Untitled Architecture',
            selectedNode: null,
            warnings: runLinter(diagram.nodes || [], diagram.edges || []),
        });
    },

    setTitle: (title) => set({ title }),

    // ── Traffic Animation ──
    toggleAnimation: () => {
        const { isAnimating, edges } = get();
        const next = !isAnimating;
        set({
            isAnimating: next,
            edges: edges.map((e) => ({
                ...e,
                animated: next,
                style: {
                    ...e.style,
                    stroke: next ? '#22d3ee' : '#64748b',
                    strokeWidth: next ? 2.5 : 2,
                },
            })),
        });
    },

    // ── Snapshots ──
    saveSnapshot: () => {
        const { nodes, edges, title, snapshots } = get();
        set({
            snapshots: [
                ...snapshots,
                {
                    id: Date.now(),
                    version: `V${snapshots.length + 1}`,
                    title,
                    nodes: JSON.parse(JSON.stringify(nodes)),
                    edges: JSON.parse(JSON.stringify(edges)),
                    timestamp: new Date().toISOString(),
                },
            ],
        });
    },

    restoreSnapshot: (id) => {
        const snap = get().snapshots.find((s) => s.id === id);
        if (!snap) return;
        get()._pushHistory();
        set({
            nodes: JSON.parse(JSON.stringify(snap.nodes)),
            edges: JSON.parse(JSON.stringify(snap.edges)),
            selectedNode: null,
            warnings: runLinter(snap.nodes, snap.edges),
        });
    },
}));

export default useDiagramStore;
