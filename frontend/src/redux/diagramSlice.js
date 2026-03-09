import { createSlice } from '@reduxjs/toolkit';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

const MAX_HISTORY = 50;

const initialState = {
    nodes: [],
    edges: [],
    diagramTitle: 'Untitled Diagram',
    selectedNode: null,
    // Undo / Redo stacks
    past: [],
    future: [],
    // Linter warnings
    warnings: [],
    // Traffic animation
    isAnimating: false,
    // Snapshots / Versioning
    snapshots: [],
};

// Helper: push current state onto the undo stack
function pushHistory(state) {
    state.past.push({ nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)) });
    if (state.past.length > MAX_HISTORY) state.past.shift();
    state.future = [];
}

// ──────────────────────── Architecture Linter ────────────────────────
function runLinter(nodes, edges) {
    const warnings = [];
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    const hasType = (sub) => nodes.some(n => n.data.subtype === sub);
    const hasDb = hasType('sql') || hasType('nosql');
    const hasGateway = hasType('gateway');
    const hasBalancer = hasType('balancer');
    const hasServer = hasType('server') || hasType('lambda');
    const hasCdn = hasType('cdn');

    // Rule 1: Database exposed without gateway
    if (hasDb && !hasGateway && hasServer) {
        warnings.push({
            id: 'no-gateway',
            severity: 'warning',
            title: 'Missing API Gateway',
            message: 'Your database is accessible through a server without an API Gateway. Add an API Gateway for security, rate limiting, and request validation.',
        });
    }

    // Rule 2: No load balancer with multiple servers
    const serverCount = nodes.filter(n => n.data.subtype === 'server').length;
    if (serverCount > 1 && !hasBalancer) {
        warnings.push({
            id: 'no-lb',
            severity: 'error',
            title: 'No Load Balancer',
            message: `You have ${serverCount} servers but no Load Balancer. Without one, traffic cannot be distributed and you have a single point of failure.`,
        });
    }

    // Rule 3: Single point of failure — only one server
    if (serverCount === 1 && hasDb) {
        warnings.push({
            id: 'spof',
            severity: 'info',
            title: 'Single Point of Failure',
            message: 'You have only one server. Consider adding a replica and a Load Balancer for high availability.',
        });
    }

    // Rule 4: No CDN for static assets
    if (hasServer && !hasCdn && nodes.length > 3) {
        warnings.push({
            id: 'no-cdn',
            severity: 'info',
            title: 'Consider Adding a CDN',
            message: 'For production systems, a CDN reduces latency for static assets and offloads traffic from your servers.',
        });
    }

    // Rule 5: No cache layer
    const hasCache = nodes.some(n => n.data.label?.toLowerCase().includes('cache') || n.data.label?.toLowerCase().includes('redis'));
    if (hasDb && hasServer && !hasCache && nodes.length > 4) {
        warnings.push({
            id: 'no-cache',
            severity: 'warning',
            title: 'No Cache Layer',
            message: 'Adding a cache (e.g. Redis) between your servers and database can reduce read latency by up to 90%.',
        });
    }

    // Rule 6: Disconnected nodes
    const connectedIds = new Set();
    edges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });
    const disconnected = nodes.filter(n => !connectedIds.has(n.id));
    if (disconnected.length > 0 && nodes.length > 1) {
        warnings.push({
            id: 'disconnected',
            severity: 'warning',
            title: `${disconnected.length} Disconnected Node${disconnected.length > 1 ? 's' : ''}`,
            message: `${disconnected.map(n => n.data.label).join(', ')} ${disconnected.length > 1 ? 'are' : 'is'} not connected to any other component. Connect them to show data flow.`,
        });
    }

    return warnings;
}

export const diagramSlice = createSlice({
    name: 'diagram',
    initialState,
    reducers: {
        setNodes: (state, action) => {
            pushHistory(state);
            state.nodes = typeof action.payload === 'function' ? action.payload(state.nodes) : action.payload;
            state.warnings = runLinter(state.nodes, state.edges);
        },
        setEdges: (state, action) => {
            pushHistory(state);
            state.edges = typeof action.payload === 'function' ? action.payload(state.edges) : action.payload;
            state.warnings = runLinter(state.nodes, state.edges);
        },
        onNodesChange: (state, action) => {
            state.nodes = applyNodeChanges(action.payload, state.nodes);
            // Don't push history for every drag pixel — only on add/remove
            const hasStructural = action.payload.some(c => c.type === 'add' || c.type === 'remove');
            if (hasStructural) {
                state.warnings = runLinter(state.nodes, state.edges);
            }
        },
        onEdgesChange: (state, action) => {
            state.edges = applyEdgeChanges(action.payload, state.edges);
            state.warnings = runLinter(state.nodes, state.edges);
        },
        onConnect: (state, action) => {
            pushHistory(state);
            const edge = {
                ...action.payload,
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 2 },
            };
            state.edges = addEdge(edge, state.edges);
            state.warnings = runLinter(state.nodes, state.edges);
        },
        setTitle: (state, action) => {
            state.diagramTitle = action.payload;
        },
        setSelectedNode: (state, action) => {
            state.selectedNode = action.payload;
        },
        updateNodeData: (state, action) => {
            const { id, data } = action.payload;
            const nodeIndex = state.nodes.findIndex(n => n.id === id);
            if (nodeIndex !== -1) {
                state.nodes[nodeIndex].data = { ...state.nodes[nodeIndex].data, ...data };
                if (state.selectedNode && state.selectedNode.id === id) {
                    state.selectedNode.data = { ...state.selectedNode.data, ...data };
                }
            }
        },
        deleteSelectedNodes: (state) => {
            pushHistory(state);
            const selected = state.nodes.filter(n => n.selected).map(n => n.id);
            if (selected.length === 0 && state.selectedNode) {
                selected.push(state.selectedNode.id);
            }
            state.nodes = state.nodes.filter(n => !selected.includes(n.id));
            state.edges = state.edges.filter(e => !selected.includes(e.source) && !selected.includes(e.target));
            state.selectedNode = null;
            state.warnings = runLinter(state.nodes, state.edges);
        },
        loadDiagram: (state, action) => {
            pushHistory(state);
            state.nodes = action.payload.nodes;
            state.edges = action.payload.edges;
            state.diagramTitle = action.payload.title || 'Untitled Diagram';
            state.selectedNode = null;
            state.warnings = runLinter(state.nodes, state.edges);
        },

        // ── Undo / Redo ──
        undo: (state) => {
            if (state.past.length === 0) return;
            state.future.push({ nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)) });
            const prev = state.past.pop();
            state.nodes = prev.nodes;
            state.edges = prev.edges;
            state.selectedNode = null;
            state.warnings = runLinter(state.nodes, state.edges);
        },
        redo: (state) => {
            if (state.future.length === 0) return;
            state.past.push({ nodes: JSON.parse(JSON.stringify(state.nodes)), edges: JSON.parse(JSON.stringify(state.edges)) });
            const next = state.future.pop();
            state.nodes = next.nodes;
            state.edges = next.edges;
            state.selectedNode = null;
            state.warnings = runLinter(state.nodes, state.edges);
        },

        // ── Traffic Animation Toggle ──
        setAnimating: (state, action) => {
            state.isAnimating = action.payload;
            state.edges = state.edges.map(e => ({
                ...e,
                animated: action.payload,
                style: {
                    ...e.style,
                    stroke: action.payload ? '#22d3ee' : '#94a3b8',
                    strokeWidth: action.payload ? 3 : 2,
                },
            }));
        },

        // ── Snapshots / Versioning ──
        saveSnapshot: (state) => {
            state.snapshots.push({
                id: Date.now(),
                version: `V${state.snapshots.length + 1}`,
                title: state.diagramTitle,
                nodes: JSON.parse(JSON.stringify(state.nodes)),
                edges: JSON.parse(JSON.stringify(state.edges)),
                timestamp: new Date().toISOString(),
            });
        },
        restoreSnapshot: (state, action) => {
            const snap = state.snapshots.find(s => s.id === action.payload);
            if (snap) {
                pushHistory(state);
                state.nodes = JSON.parse(JSON.stringify(snap.nodes));
                state.edges = JSON.parse(JSON.stringify(snap.edges));
                state.selectedNode = null;
                state.warnings = runLinter(state.nodes, state.edges);
            }
        },
    },
});

export const {
    setNodes, setEdges, onNodesChange, onEdgesChange, onConnect,
    setTitle, setSelectedNode, updateNodeData, deleteSelectedNodes,
    loadDiagram, undo, redo, setAnimating,
    saveSnapshot, restoreSnapshot,
} = diagramSlice.actions;

export default diagramSlice.reducer;
