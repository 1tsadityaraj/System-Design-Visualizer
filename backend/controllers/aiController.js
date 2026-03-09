// ──────────────────────────────────────────────────────────
// AI Suggestion Controller (Rule-based + LLM-ready)
// ──────────────────────────────────────────────────────────

// Smart rule-based suggestion engine
function analyzeArchitecture(nodes) {
    const types = new Set(nodes.map(n => n.data?.subtype).filter(Boolean));
    const suggestions = [];

    const serverCount = nodes.filter(n => n.data?.subtype === 'server').length;

    if (types.has('server') && !types.has('balancer') && serverCount >= 1) {
        suggestions.push({
            type: 'add',
            component: 'balancer',
            label: 'Load Balancer',
            reason: 'You have server instance(s) without a Load Balancer. Adding one enables horizontal scaling and eliminates single points of failure.',
            priority: 'high',
        });
    }

    if (types.has('server') && !types.has('cache')) {
        suggestions.push({
            type: 'add',
            component: 'cache',
            label: 'Redis Cache',
            reason: 'Adding a cache layer between your servers and database can reduce read latency by up to 90% and decrease database load significantly.',
            priority: 'high',
        });
    }

    if (types.has('server') && !types.has('gateway')) {
        suggestions.push({
            type: 'add',
            component: 'gateway',
            label: 'API Gateway',
            reason: 'An API Gateway provides rate limiting, authentication, request validation, and API versioning in a centralized layer.',
            priority: 'medium',
        });
    }

    if (types.has('server') && !types.has('cdn')) {
        suggestions.push({
            type: 'add',
            component: 'cdn',
            label: 'CDN',
            reason: 'A CDN reduces latency for static assets and offloads traffic from your origin servers to edge locations globally.',
            priority: 'medium',
        });
    }

    if (types.has('server') && !types.has('queue')) {
        suggestions.push({
            type: 'add',
            component: 'queue',
            label: 'Message Queue',
            reason: 'A message queue enables asynchronous processing, decouples services, and helps handle traffic spikes gracefully.',
            priority: 'low',
        });
    }

    if (serverCount > 1 && !types.has('balancer')) {
        suggestions.push({
            type: 'warning',
            component: null,
            label: 'Multiple Servers Without LB',
            reason: `You have ${serverCount} server instances but no load balancer. Traffic cannot be distributed evenly.`,
            priority: 'critical',
        });
    }

    // Check for orphaned nodes
    // (We'd need edges for this, but we can flag it as a general tip)

    if (suggestions.length === 0) {
        suggestions.push({
            type: 'info',
            component: null,
            label: 'Architecture Looks Good',
            reason: 'Your current architecture covers the major concerns. Consider adding monitoring, alerting, or CI/CD pipelines.',
            priority: 'low',
        });
    }

    return suggestions;
}

exports.suggest = async (req, res) => {
    try {
        const { nodes } = req.body;
        if (!nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ message: 'Please provide a nodes array' });
        }

        const suggestions = analyzeArchitecture(nodes);
        res.json({ suggestions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Natural Language → Diagram
const TEMPLATES = {
    streaming: {
        title: 'Streaming Platform Architecture',
        nodes: [
            { id: 'n0', type: 'systemNode', position: { x: 400, y: 0 }, data: { subtype: 'client', label: 'Web/Mobile Client', status: 'healthy' } },
            { id: 'n1', type: 'systemNode', position: { x: 400, y: 120 }, data: { subtype: 'cdn', label: 'CDN', status: 'healthy' } },
            { id: 'n2', type: 'systemNode', position: { x: 400, y: 240 }, data: { subtype: 'balancer', label: 'Load Balancer', status: 'healthy' } },
            { id: 'n3', type: 'systemNode', position: { x: 400, y: 360 }, data: { subtype: 'gateway', label: 'API Gateway', status: 'healthy' } },
            { id: 'n4', type: 'systemNode', position: { x: 200, y: 480 }, data: { subtype: 'server', label: 'Auth Service', status: 'healthy' } },
            { id: 'n5', type: 'systemNode', position: { x: 600, y: 480 }, data: { subtype: 'server', label: 'Content Service', status: 'healthy' } },
            { id: 'n6', type: 'systemNode', position: { x: 400, y: 480 }, data: { subtype: 'cache', label: 'Redis Cache', status: 'healthy' } },
            { id: 'n7', type: 'systemNode', position: { x: 200, y: 620 }, data: { subtype: 'nosql', label: 'User DB', status: 'healthy' } },
            { id: 'n8', type: 'systemNode', position: { x: 600, y: 620 }, data: { subtype: 's3', label: 'Video Storage', status: 'healthy' } },
        ],
        edges: [
            { id: 'e0', source: 'n0', target: 'n1', type: 'smoothstep' },
            { id: 'e1', source: 'n1', target: 'n2', type: 'smoothstep' },
            { id: 'e2', source: 'n2', target: 'n3', type: 'smoothstep' },
            { id: 'e3', source: 'n3', target: 'n4', type: 'smoothstep' },
            { id: 'e4', source: 'n3', target: 'n5', type: 'smoothstep' },
            { id: 'e5', source: 'n3', target: 'n6', type: 'smoothstep' },
            { id: 'e6', source: 'n4', target: 'n7', type: 'smoothstep' },
            { id: 'e7', source: 'n5', target: 'n8', type: 'smoothstep' },
        ],
    },
    chat: {
        title: 'Real-time Chat Architecture',
        nodes: [
            { id: 'n0', type: 'systemNode', position: { x: 400, y: 0 }, data: { subtype: 'client', label: 'Chat Client', status: 'healthy' } },
            { id: 'n1', type: 'systemNode', position: { x: 400, y: 120 }, data: { subtype: 'balancer', label: 'Load Balancer', status: 'healthy' } },
            { id: 'n2', type: 'systemNode', position: { x: 400, y: 240 }, data: { subtype: 'server', label: 'WebSocket Server', status: 'healthy' } },
            { id: 'n3', type: 'systemNode', position: { x: 200, y: 380 }, data: { subtype: 'cache', label: 'Redis Pub/Sub', status: 'healthy' } },
            { id: 'n4', type: 'systemNode', position: { x: 600, y: 380 }, data: { subtype: 'queue', label: 'Message Queue', status: 'healthy' } },
            { id: 'n5', type: 'systemNode', position: { x: 400, y: 520 }, data: { subtype: 'nosql', label: 'Message DB', status: 'healthy' } },
        ],
        edges: [
            { id: 'e0', source: 'n0', target: 'n1', type: 'smoothstep' },
            { id: 'e1', source: 'n1', target: 'n2', type: 'smoothstep' },
            { id: 'e2', source: 'n2', target: 'n3', type: 'smoothstep' },
            { id: 'e3', source: 'n2', target: 'n4', type: 'smoothstep' },
            { id: 'e4', source: 'n3', target: 'n5', type: 'smoothstep' },
            { id: 'e5', source: 'n4', target: 'n5', type: 'smoothstep' },
        ],
    },
};

exports.naturalLanguage = async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) return res.status(400).json({ message: 'Please provide a description' });

        const input = description.toLowerCase();
        let template;

        if (input.includes('chat') || input.includes('whatsapp') || input.includes('message') || input.includes('real-time')) {
            template = TEMPLATES.chat;
        } else {
            template = TEMPLATES.streaming;
        }

        res.json({ diagram: template });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
