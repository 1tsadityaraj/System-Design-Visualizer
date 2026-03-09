// ──────────────────────────────────────────────────────────
// AI Controller — Gemini API Integration + Rule-Based Fallback
// ──────────────────────────────────────────────────────────
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

// ═══════════════════════════════════════════════════
//  1. POST /api/ai/suggest — Architecture Suggestions
// ═══════════════════════════════════════════════════

// Rule-based fallback (always available, no API key needed)
function ruleBasedSuggestions(nodes) {
    const types = new Set(nodes.map((n) => n.data?.subtype).filter(Boolean));
    const suggestions = [];
    const serverCount = nodes.filter((n) => n.data?.subtype === 'server').length;

    if (types.has('server') && !types.has('balancer') && serverCount >= 1) {
        suggestions.push({
            type: 'add', component: 'balancer', label: 'Load Balancer',
            reason: 'You have server instance(s) without a Load Balancer. Adding one enables horizontal scaling and eliminates single points of failure.',
            priority: 'high',
        });
    }
    if (types.has('server') && !types.has('cache')) {
        suggestions.push({
            type: 'add', component: 'cache', label: 'Redis Cache',
            reason: 'Adding a cache layer between your servers and database can reduce read latency by up to 90% and decrease database load significantly.',
            priority: 'high',
        });
    }
    if (types.has('server') && !types.has('gateway')) {
        suggestions.push({
            type: 'add', component: 'gateway', label: 'API Gateway',
            reason: 'An API Gateway provides rate limiting, authentication, request validation, and API versioning in a centralized layer.',
            priority: 'medium',
        });
    }
    if (types.has('server') && !types.has('cdn')) {
        suggestions.push({
            type: 'add', component: 'cdn', label: 'CDN',
            reason: 'A CDN reduces latency for static assets and offloads traffic from your origin servers to edge locations globally.',
            priority: 'medium',
        });
    }
    if (types.has('server') && !types.has('queue')) {
        suggestions.push({
            type: 'add', component: 'queue', label: 'Message Queue',
            reason: 'A message queue enables asynchronous processing, decouples services, and helps handle traffic spikes gracefully.',
            priority: 'low',
        });
    }
    if (serverCount > 1 && !types.has('balancer')) {
        suggestions.push({
            type: 'warning', component: null, label: 'Multiple Servers Without LB',
            reason: `You have ${serverCount} server instances but no load balancer. Traffic cannot be distributed evenly.`,
            priority: 'critical',
        });
    }
    if (suggestions.length === 0) {
        suggestions.push({
            type: 'info', component: null, label: 'Architecture Looks Good',
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

        // If Gemini API key is configured, use it for smarter suggestions
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                const nodesSummary = nodes.map((n) => `${n.data?.label} (${n.data?.subtype})`).join(', ');

                const prompt = `You are a senior system architect. Analyze this system architecture and suggest improvements.

Current components: ${nodesSummary}

Return a JSON array of suggestions. Each suggestion must have:
- "type": "add" or "warning" or "info"
- "component": one of "server", "lambda", "sql", "nosql", "s3", "balancer", "gateway", "cdn", "cache", "queue", or null
- "label": human-readable name for the suggested component
- "reason": 1-2 sentence explanation of WHY this improves the architecture
- "priority": "critical", "high", "medium", or "low"

Focus on: scalability, fault tolerance, security, performance, and cost optimization.
Only return the JSON array, nothing else. No markdown formatting.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();

                // Parse the JSON from Gemini's response
                let suggestions;
                try {
                    // Handle if Gemini wraps in markdown code block
                    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
                    suggestions = JSON.parse(cleaned);
                } catch (parseErr) {
                    console.warn('Gemini response parse failed, falling back to rules:', parseErr.message);
                    suggestions = ruleBasedSuggestions(nodes);
                }

                return res.json({ suggestions, source: 'gemini' });
            } catch (geminiErr) {
                console.warn('Gemini API error, falling back to rules:', geminiErr.message);
            }
        }

        // Fallback to rule-based
        const suggestions = ruleBasedSuggestions(nodes);
        res.json({ suggestions, source: 'rules' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ═══════════════════════════════════════════════════
//  2. POST /api/ai/nlp — Natural Language → Diagram
// ═══════════════════════════════════════════════════

const VALID_SUBTYPES = ['server', 'lambda', 'sql', 'nosql', 's3', 'balancer', 'gateway', 'cdn', 'cache', 'queue', 'client'];

exports.naturalLanguage = async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) return res.status(400).json({ message: 'Please provide a description' });

        // If Gemini API key is configured, use AI to generate the diagram
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                const prompt = `You are a system architect. Convert this description into a system architecture diagram.

Description: "${description}"

Return a JSON object with:
1. "title": a short title for this architecture
2. "nodes": array of nodes, each with:
   - "id": unique string like "n0", "n1", etc.
   - "type": always "systemNode"
   - "position": {"x": number, "y": number} — arrange vertically with ~140px spacing, centered around x=400, fan out horizontally for parallel services
   - "data": {"subtype": one of [${VALID_SUBTYPES.join(', ')}], "label": descriptive name, "status": "healthy"}
3. "edges": array of edges, each with:
   - "id": unique string like "e0", "e1", etc.
   - "source": source node id
   - "target": target node id
   - "type": "smoothstep"

Design a production-grade architecture with proper patterns:
- Start with client/user at the top
- Add CDN, Load Balancer, API Gateway as needed
- Place services in the middle tier
- Put databases and storage at the bottom
- Include cache layers and message queues where appropriate

Use realistic component names (not generic). Only return valid JSON, no markdown.`;

                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();

                let diagram;
                try {
                    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
                    diagram = JSON.parse(cleaned);

                    // Validate the structure
                    if (!diagram.nodes || !Array.isArray(diagram.nodes)) throw new Error('Invalid nodes');
                    if (!diagram.edges || !Array.isArray(diagram.edges)) throw new Error('Invalid edges');

                    // Sanitize subtypes — ensure they're valid
                    diagram.nodes = diagram.nodes.map((n) => ({
                        ...n,
                        type: 'systemNode',
                        data: {
                            ...n.data,
                            subtype: VALID_SUBTYPES.includes(n.data?.subtype) ? n.data.subtype : 'server',
                            status: 'healthy',
                        },
                    }));
                } catch (parseErr) {
                    console.warn('Gemini NLP parse failed, falling back to keywords:', parseErr.message);
                    return res.json({ diagram: keywordFallback(description), source: 'fallback' });
                }

                return res.json({ diagram, source: 'gemini' });
            } catch (geminiErr) {
                console.warn('Gemini API error for NLP, falling back:', geminiErr.message);
            }
        }

        // Keyword-based fallback
        res.json({ diagram: keywordFallback(description), source: 'fallback' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ───── Keyword-based fallback templates ─────
function keywordFallback(description) {
    const input = description.toLowerCase();

    const TEMPLATES = {
        chat: {
            title: 'Real-time Chat Architecture',
            nodes: [
                { id: 'n0', type: 'systemNode', position: { x: 400, y: 0 }, data: { subtype: 'client', label: 'Chat Client', status: 'healthy' } },
                { id: 'n1', type: 'systemNode', position: { x: 400, y: 140 }, data: { subtype: 'balancer', label: 'Load Balancer', status: 'healthy' } },
                { id: 'n2', type: 'systemNode', position: { x: 400, y: 280 }, data: { subtype: 'server', label: 'WebSocket Server', status: 'healthy' } },
                { id: 'n3', type: 'systemNode', position: { x: 200, y: 420 }, data: { subtype: 'cache', label: 'Redis Pub/Sub', status: 'healthy' } },
                { id: 'n4', type: 'systemNode', position: { x: 600, y: 420 }, data: { subtype: 'queue', label: 'Message Queue', status: 'healthy' } },
                { id: 'n5', type: 'systemNode', position: { x: 400, y: 560 }, data: { subtype: 'nosql', label: 'Message DB', status: 'healthy' } },
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
        streaming: {
            title: 'Streaming Platform Architecture',
            nodes: [
                { id: 'n0', type: 'systemNode', position: { x: 400, y: 0 }, data: { subtype: 'client', label: 'Web / Mobile Client', status: 'healthy' } },
                { id: 'n1', type: 'systemNode', position: { x: 400, y: 140 }, data: { subtype: 'cdn', label: 'CloudFront CDN', status: 'healthy' } },
                { id: 'n2', type: 'systemNode', position: { x: 400, y: 280 }, data: { subtype: 'balancer', label: 'Load Balancer', status: 'healthy' } },
                { id: 'n3', type: 'systemNode', position: { x: 400, y: 420 }, data: { subtype: 'gateway', label: 'API Gateway', status: 'healthy' } },
                { id: 'n4', type: 'systemNode', position: { x: 200, y: 560 }, data: { subtype: 'server', label: 'Auth Service', status: 'healthy' } },
                { id: 'n5', type: 'systemNode', position: { x: 600, y: 560 }, data: { subtype: 'server', label: 'Content Service', status: 'healthy' } },
                { id: 'n6', type: 'systemNode', position: { x: 400, y: 560 }, data: { subtype: 'cache', label: 'Redis Cache', status: 'healthy' } },
                { id: 'n7', type: 'systemNode', position: { x: 200, y: 700 }, data: { subtype: 'nosql', label: 'User DB', status: 'healthy' } },
                { id: 'n8', type: 'systemNode', position: { x: 600, y: 700 }, data: { subtype: 's3', label: 'Video Storage (S3)', status: 'healthy' } },
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
        ecommerce: {
            title: 'E-Commerce Platform',
            nodes: [
                { id: 'n0', type: 'systemNode', position: { x: 400, y: 0 }, data: { subtype: 'client', label: 'Web Store', status: 'healthy' } },
                { id: 'n1', type: 'systemNode', position: { x: 400, y: 140 }, data: { subtype: 'cdn', label: 'CDN', status: 'healthy' } },
                { id: 'n2', type: 'systemNode', position: { x: 400, y: 280 }, data: { subtype: 'balancer', label: 'Load Balancer', status: 'healthy' } },
                { id: 'n3', type: 'systemNode', position: { x: 400, y: 420 }, data: { subtype: 'gateway', label: 'API Gateway', status: 'healthy' } },
                { id: 'n4', type: 'systemNode', position: { x: 150, y: 560 }, data: { subtype: 'server', label: 'Product Service', status: 'healthy' } },
                { id: 'n5', type: 'systemNode', position: { x: 400, y: 560 }, data: { subtype: 'server', label: 'Order Service', status: 'healthy' } },
                { id: 'n6', type: 'systemNode', position: { x: 650, y: 560 }, data: { subtype: 'server', label: 'Payment Service', status: 'healthy' } },
                { id: 'n7', type: 'systemNode', position: { x: 150, y: 700 }, data: { subtype: 'sql', label: 'Product DB', status: 'healthy' } },
                { id: 'n8', type: 'systemNode', position: { x: 400, y: 700 }, data: { subtype: 'sql', label: 'Order DB', status: 'healthy' } },
                { id: 'n9', type: 'systemNode', position: { x: 650, y: 700 }, data: { subtype: 'queue', label: 'Payment Events', status: 'healthy' } },
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
                { id: 'e8', source: 'n6', target: 'n9', type: 'smoothstep' },
            ],
        },
    };

    if (input.includes('chat') || input.includes('whatsapp') || input.includes('message') || input.includes('real-time')) {
        return TEMPLATES.chat;
    }
    if (input.includes('shop') || input.includes('ecommerce') || input.includes('store') || input.includes('payment') || input.includes('amazon')) {
        return TEMPLATES.ecommerce;
    }
    return TEMPLATES.streaming;
}
