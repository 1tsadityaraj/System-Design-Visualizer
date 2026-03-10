// ─────────────────────────────────────────────────────────────────
// Zustand Store — Diagram State with Undo/Redo, Chaos, Security & Cost
// ─────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { v4 as uuid } from 'uuid';

const MAX_HISTORY = 40;

// ── AWS Pricing (Mock) ─────────────────────────────────────────
export const AWS_PRICING = {
    't3.micro':   { hourly: 0.0104, label: 't3.micro',   vcpu: 2,  ram: 1 },
    't3.small':   { hourly: 0.0208, label: 't3.small',   vcpu: 2,  ram: 2 },
    't3.medium':  { hourly: 0.0416, label: 't3.medium',  vcpu: 2,  ram: 4 },
    'm5.large':   { hourly: 0.096,  label: 'm5.large',   vcpu: 2,  ram: 8 },
    'm5.xlarge':  { hourly: 0.192,  label: 'm5.xlarge',  vcpu: 4,  ram: 16 },
    'c5.large':   { hourly: 0.085,  label: 'c5.large',   vcpu: 2,  ram: 4 },
    'c5.xlarge':  { hourly: 0.170,  label: 'c5.xlarge',  vcpu: 4,  ram: 8 },
    'c5.2xlarge': { hourly: 0.340,  label: 'c5.2xlarge', vcpu: 8,  ram: 16 },
    'r5.large':   { hourly: 0.126,  label: 'r5.large',   vcpu: 2,  ram: 16 },
    'r5.xlarge':  { hourly: 0.252,  label: 'r5.xlarge',  vcpu: 4,  ram: 32 },
    'serverless': { hourly: 0.00,   label: 'Serverless', vcpu: 0,  ram: 0 },
};

// ── Region Data ────────────────────────────────────────────────
export const REGION_META = {
    'us-east-1':    { name: 'US East (N. Virginia)', lat: 39.0, lng: -77.5 },
    'us-west-2':    { name: 'US West (Oregon)',      lat: 45.5, lng: -122.7 },
    'eu-central-1': { name: 'EU (Frankfurt)',        lat: 50.1, lng: 8.7 },
    'ap-south-1':   { name: 'Asia Pacific (Mumbai)', lat: 19.1, lng: 72.9 },
    'global':       { name: 'Global',                lat: 0,    lng: 0 },
};

// Cross-region data transfer cost $/GB
const CROSS_REGION_COST_PER_GB = 0.02;
const CROSS_REGION_LATENCY_MS = {
    'us-east-1|us-west-2': 60,
    'us-east-1|eu-central-1': 85,
    'us-east-1|ap-south-1': 170,
    'us-west-2|eu-central-1': 140,
    'us-west-2|ap-south-1': 200,
    'eu-central-1|ap-south-1': 120,
};

function getLatencyPenalty(r1, r2) {
    if (r1 === r2 || r1 === 'global' || r2 === 'global') return { latency: 1, cost: 0 };
    const key = [r1, r2].sort().join('|');
    return {
        latency: CROSS_REGION_LATENCY_MS[key] || 100,
        cost: CROSS_REGION_COST_PER_GB,
    };
}

// ── Managed Service Costs (monthly estimates) ──────────────────
const SERVICE_COSTS = {
    sql:      45.00,
    nosql:    25.00,
    s3:       5.00,
    balancer: 22.00,
    gateway:  35.00,
    cdn:      10.00,
    cache:    15.00,
    queue:    1.00,
    lambda:   0.50,
    client:   0.00,
};

// ── Cost Calculator ────────────────────────────────────────────
function calculateCost(nodes, edges) {
    let monthlyCost = 0;
    const breakdown = [];

    nodes.forEach(node => {
        const { subtype, label, size = 't3.micro', region = 'us-east-1', status } = node.data;
        if (status === 'killed') return; // Dead nodes don't cost

        if (subtype === 'server') {
            const pricing = AWS_PRICING[size] || AWS_PRICING['t3.micro'];
            const monthly = pricing.hourly * 730; // ~730 hours/month
            monthlyCost += monthly;
            breakdown.push({ node: label, type: 'Compute', cost: monthly, detail: `${pricing.label} @ $${pricing.hourly}/hr` });
        } else {
            const baseCost = SERVICE_COSTS[subtype] || 0;
            monthlyCost += baseCost;
            if (baseCost > 0) {
                breakdown.push({ node: label, type: subtype, cost: baseCost, detail: 'Managed service' });
            }
        }
    });

    // Cross-region data transfer costs
    let transferCost = 0;
    edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) return;
        const r1 = source.data.region || 'us-east-1';
        const r2 = target.data.region || 'us-east-1';
        if (r1 !== r2 && r1 !== 'global' && r2 !== 'global') {
            const penalty = getLatencyPenalty(r1, r2);
            const xferCost = penalty.cost * 100; // assume 100GB/month transfer
            transferCost += xferCost;
        }
    });

    if (transferCost > 0) {
        monthlyCost += transferCost;
        breakdown.push({ node: 'Data Transfer', type: 'network', cost: transferCost, detail: 'Cross-region transfer' });
    }

    return { total: monthlyCost, breakdown };
}

// ── Security Rules Engine ──────────────────────────────────────
function runSecurityAudit(nodes, edges) {
    const findings = [];
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    const hasGateway = nodes.some(n => n.data.subtype === 'gateway');
    const hasWaf = nodes.some(n => n.data.label?.toLowerCase().includes('waf'));
    const clientNodes = nodes.filter(n => n.data.subtype === 'client');
    const dbNodes = nodes.filter(n => ['sql', 'nosql', 's3'].includes(n.data.subtype));
    const serverNodes = nodes.filter(n => n.data.subtype === 'server' || n.data.subtype === 'lambda');

    // Rule 1: Client → Server without API Gateway or WAF
    clientNodes.forEach(client => {
        const clientEdges = edges.filter(e => e.source === client.id || e.target === client.id);
        clientEdges.forEach(edge => {
            const otherId = edge.source === client.id ? edge.target : edge.source;
            const other = nodeMap[otherId];
            if (other && (other.data.subtype === 'server' || other.data.subtype === 'lambda')) {
                if (!hasGateway && !hasWaf) {
                    findings.push({
                        id: `insecure-edge-${edge.id}`,
                        severity: 'high',
                        type: 'encryption',
                        title: 'Unprotected Client-Server Connection',
                        message: `Traffic between "${client.data.label}" and "${other.data.label}" bypasses API Gateway/WAF. Add an API Gateway or WAF for rate limiting, authentication, and threat protection.`,
                        edgeId: edge.id,
                        affectedNodes: [client.id, otherId],
                    });
                }
            }
        });
    });

    // Rule 2: Database directly exposed to client
    clientNodes.forEach(client => {
        const clientEdges = edges.filter(e => e.source === client.id || e.target === client.id);
        clientEdges.forEach(edge => {
            const otherId = edge.source === client.id ? edge.target : edge.source;
            const other = nodeMap[otherId];
            if (other && ['sql', 'nosql', 's3'].includes(other.data.subtype)) {
                findings.push({
                    id: `direct-db-${edge.id}`,
                    severity: 'critical',
                    type: 'network-isolation',
                    title: 'Critical: Direct Database Exposure',
                    message: `"${other.data.label}" is directly accessible from "${client.data.label}". Databases must be in a private subnet, accessible only through backend services.`,
                    edgeId: edge.id,
                    affectedNodes: [client.id, otherId],
                });
            }
        });
    });

    // Rule 3: No encryption in transit (server → db without TLS indicator)
    serverNodes.forEach(server => {
        const serverEdges = edges.filter(e => e.source === server.id);
        serverEdges.forEach(edge => {
            const target = nodeMap[edge.target];
            if (target && ['sql', 'nosql'].includes(target.data.subtype)) {
                if (!server.data.label?.toLowerCase().includes('tls') && !target.data.label?.toLowerCase().includes('tls')) {
                    findings.push({
                        id: `no-tls-${edge.id}`,
                        severity: 'medium',
                        type: 'encryption',
                        title: 'Encryption in Transit Not Verified',
                        message: `Connection from "${server.data.label}" to "${target.data.label}" may not use TLS/SSL. Enable encryption in transit for data protection.`,
                        edgeId: edge.id,
                        affectedNodes: [server.id, target.id],
                    });
                }
            }
        });
    });

    // Rule 4: Single region = no DR
    const regions = new Set(nodes.map(n => n.data.region || 'us-east-1').filter(r => r !== 'global'));
    if (regions.size === 1 && nodes.length > 3) {
        findings.push({
            id: 'single-region',
            severity: 'medium',
            type: 'availability',
            title: 'No Multi-Region Redundancy',
            message: 'All resources are in a single region. Consider multi-region deployment for disaster recovery and lower latency.',
            affectedNodes: [],
        });
    }

    // Rule 5: No authentication layer
    if (!hasGateway && serverNodes.length > 0 && clientNodes.length > 0) {
        findings.push({
            id: 'no-auth',
            severity: 'high',
            type: 'authentication',
            title: 'No Authentication Layer',
            message: 'No API Gateway detected for authentication. All endpoints may be publicly accessible without rate limiting or token validation.',
            affectedNodes: [],
        });
    }

    return findings;
}

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

// ── Chaos Engine: Graph Propagation ───────────────────────────
function propagateChaos(nodes, edges, killedNodeId) {
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = { ...n, data: { ...n.data } }; });

    const killedNode = nodeMap[killedNodeId];
    if (!killedNode) return { nodes, edges };

    // Mark the killed node
    killedNode.data.status = 'killed';
    killedNode.data.originalStatus = killedNode.data.originalStatus || killedNode.data.status;

    // Check if there is a replica (same subtype and label contains the base name)
    const baseLabel = killedNode.data.label.replace(/\s*#?\d+$/, '').replace(/\s*replica.*$/i, '').trim();
    const replica = nodes.find(n =>
        n.id !== killedNodeId &&
        n.data.subtype === killedNode.data.subtype &&
        n.data.status !== 'killed' &&
        (n.data.label.replace(/\s*#?\d+$/, '').replace(/\s*replica.*$/i, '').trim() === baseLabel)
    );

    let updatedEdges = edges.map(e => ({ ...e, style: { ...e.style } }));

    if (replica) {
        // Re-route traffic through replica
        updatedEdges = updatedEdges.map(e => {
            if (e.target === killedNodeId) {
                return {
                    ...e,
                    target: replica.id,
                    animated: true,
                    style: { ...e.style, stroke: '#22c55e', strokeWidth: 2.5, strokeDasharray: '5 3' },
                    data: { ...e.data, rerouted: true },
                };
            }
            if (e.source === killedNodeId) {
                return {
                    ...e,
                    source: replica.id,
                    animated: true,
                    style: { ...e.style, stroke: '#22c55e', strokeWidth: 2.5, strokeDasharray: '5 3' },
                    data: { ...e.data, rerouted: true },
                };
            }
            return e;
        });
    } else {
        // No replica: mark edges from killed node as dead
        updatedEdges = updatedEdges.map(e => {
            if (e.source === killedNodeId || e.target === killedNodeId) {
                return {
                    ...e,
                    animated: false,
                    style: { ...e.style, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '8 4', opacity: 0.6 },
                    data: { ...e.data, dead: true },
                };
            }
            return e;
        });

        // Propagate degradation downstream (BFS)
        const downstream = new Set();
        const queue = [killedNodeId];
        while (queue.length > 0) {
            const current = queue.shift();
            edges.forEach(e => {
                if (e.source === current && !downstream.has(e.target)) {
                    downstream.add(e.target);
                    queue.push(e.target);
                }
            });
        }

        // Mark downstream nodes as degraded
        downstream.forEach(nid => {
            if (nodeMap[nid] && nodeMap[nid].data.status !== 'killed') {
                nodeMap[nid].data.originalStatus = nodeMap[nid].data.originalStatus || nodeMap[nid].data.status;
                nodeMap[nid].data.status = 'degraded';
            }
        });

        // If any client is downstream or upstream, mark it as down
        const upstream = new Set();
        const uQueue = [killedNodeId];
        while (uQueue.length > 0) {
            const current = uQueue.shift();
            edges.forEach(e => {
                if (e.target === current && !upstream.has(e.source)) {
                    upstream.add(e.source);
                    uQueue.push(e.source);
                }
            });
        }

        [...downstream, ...upstream].forEach(nid => {
            if (nodeMap[nid] && nodeMap[nid].data.subtype === 'client' && nodeMap[nid].data.status !== 'killed') {
                nodeMap[nid].data.status = 'error';
            }
        });
    }

    return {
        nodes: Object.values(nodeMap),
        edges: updatedEdges,
    };
}

// ── Edge styling helper based on security/region ──────────────
function computeEdgeStyle(edge, nodes, isAnimating, securityMode, securityFindings) {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    let style = { ...edge.style };
    let animated = edge.animated;
    let className = '';

    // Cross-region dashed lines
    if (source && target) {
        const r1 = source.data.region || 'us-east-1';
        const r2 = target.data.region || 'us-east-1';
        if (r1 !== r2 && r1 !== 'global' && r2 !== 'global') {
            style.strokeDasharray = '10 5';
            className = 'cross-region-edge';
        }
    }

    // Security overlay
    if (securityMode && securityFindings) {
        const finding = securityFindings.find(f => f.edgeId === edge.id);
        if (finding) {
            if (finding.severity === 'critical') {
                style.stroke = '#ef4444';
                style.strokeWidth = 3;
                animated = true;
                className = 'security-critical-edge';
            } else if (finding.severity === 'high') {
                style.stroke = '#f97316';
                style.strokeWidth = 2.5;
                animated = true;
                className = 'security-high-edge';
            } else if (finding.severity === 'medium') {
                style.stroke = '#fbbf24';
                style.strokeWidth = 2;
            }
        }
    }

    return { ...edge, style, animated, className };
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

    // ── Chaos Engineering ──
    chaosMode: false,
    killedNodes: [],

    // ── Security ──
    securityMode: false,
    securityFindings: [],

    // ── Cost ──
    costData: { total: 0, breakdown: [] },

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
            costData: calculateCost(prev.nodes, prev.edges),
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
            costData: calculateCost(next.nodes, next.edges),
        });
    },

    // ── Node / Edge mutations ──
    onNodesChange: (changes) => {
        const { nodes } = get();
        const updated = applyNodeChanges(changes, nodes);
        const structural = changes.some((c) => c.type === 'add' || c.type === 'remove');
        set({
            nodes: updated,
            ...(structural ? {
                warnings: runLinter(updated, get().edges),
                costData: calculateCost(updated, get().edges),
            } : {}),
        });
    },

    onEdgesChange: (changes) => {
        const { edges, nodes } = get();
        const updated = applyEdgeChanges(changes, edges);
        set({
            edges: updated,
            warnings: runLinter(nodes, updated),
            costData: calculateCost(nodes, updated),
        });
    },

    onConnect: (connection) => {
        get()._pushHistory();
        const { edges, nodes, isAnimating } = get();
        const edge = {
            ...connection,
            id: `e-${uuid()}`,
            type: 'smoothstep',
            animated: isAnimating,
            style: {
                stroke: isAnimating ? '#22d3ee' : '#64748b',
                strokeWidth: 2,
            },
        };
        const updated = addEdge(edge, edges);
        set({
            edges: updated,
            warnings: runLinter(nodes, updated),
            costData: calculateCost(nodes, updated),
            securityFindings: get().securityMode ? runSecurityAudit(nodes, updated) : get().securityFindings,
        });
    },

    addNode: (nodeData) => {
        get()._pushHistory();
        const { nodes, edges } = get();
        const newNode = {
            id: `node-${uuid()}`,
            type: 'systemNode',
            position: nodeData.position,
            data: { ...nodeData.data, status: 'healthy', region: 'us-east-1', size: 't3.micro' },
        };
        const updated = [...nodes, newNode];
        set({
            nodes: updated,
            warnings: runLinter(updated, edges),
            costData: calculateCost(updated, edges),
        });
    },

    setSelectedNode: (node) => set({ selectedNode: node }),

    updateNodeData: (id, data) => {
        const { nodes, selectedNode, edges, securityMode } = get();
        const updated = nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
        );
        set({
            nodes: updated,
            selectedNode:
                selectedNode?.id === id
                    ? { ...selectedNode, data: { ...selectedNode.data, ...data } }
                    : selectedNode,
            costData: calculateCost(updated, edges),
            securityFindings: securityMode ? runSecurityAudit(updated, edges) : get().securityFindings,
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
            costData: calculateCost(newNodes, newEdges),
            securityFindings: get().securityMode ? runSecurityAudit(newNodes, newEdges) : [],
        });
    },

    // ── Diagram load ──
    loadDiagram: (diagram) => {
        get()._pushHistory();
        const n = diagram.nodes || [];
        const e = diagram.edges || [];
        set({
            nodes: n,
            edges: e,
            title: diagram.title || 'Untitled Architecture',
            selectedNode: null,
            warnings: runLinter(n, e),
            costData: calculateCost(n, e),
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

    // ── Chaos Engineering ──
    toggleChaosMode: () => {
        const { chaosMode, nodes, edges } = get();
        if (chaosMode) {
            // Exiting chaos mode, restore all nodes
            const restored = nodes.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    status: n.data.originalStatus || 'healthy',
                    originalStatus: undefined,
                },
            }));
            const restoredEdges = edges.map(e => ({
                ...e,
                animated: false,
                style: { stroke: '#64748b', strokeWidth: 2 },
                data: { ...(e.data || {}), dead: false, rerouted: false },
            }));
            set({
                chaosMode: false,
                killedNodes: [],
                nodes: restored,
                edges: restoredEdges,
            });
        } else {
            set({ chaosMode: true, killedNodes: [] });
        }
    },

    killNode: (nodeId) => {
        const { chaosMode, nodes, edges, killedNodes } = get();
        if (!chaosMode) return;
        if (killedNodes.includes(nodeId)) return;

        get()._pushHistory();
        const result = propagateChaos(nodes, edges, nodeId);
        set({
            nodes: result.nodes,
            edges: result.edges,
            killedNodes: [...killedNodes, nodeId],
        });
    },

    // ── Security View ──
    toggleSecurityMode: () => {
        const { securityMode, nodes, edges } = get();
        if (!securityMode) {
            const findings = runSecurityAudit(nodes, edges);
            set({ securityMode: true, securityFindings: findings });
        } else {
            set({ securityMode: false, securityFindings: [] });
        }
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
            costData: calculateCost(snap.nodes, snap.edges),
        });
    },

    // ── Computed edge styles (for rendering) ──
    getStyledEdges: () => {
        const { edges, nodes, isAnimating, securityMode, securityFindings } = get();
        return edges.map(e => computeEdgeStyle(e, nodes, isAnimating, securityMode, securityFindings));
    },
}));

export default useDiagramStore;
