// ──────────────────────────────────────────────────────
// Serialization Utility
// Converts React Flow JSON → clean hierarchical JSON
// ──────────────────────────────────────────────────────

/**
 * Converts a flat array of nodes + edges into a hierarchical tree structure.
 * This is useful for storing the diagram in a more readable format
 * and for exporting to documentation systems.
 */
function serializeToHierarchy(nodes, edges) {
    // Build adjacency list
    const children = {};
    const hasParent = new Set();

    edges.forEach(e => {
        if (!children[e.source]) children[e.source] = [];
        children[e.source].push(e.target);
        hasParent.add(e.target);
    });

    // Find root nodes (no incoming edges)
    const roots = nodes.filter(n => !hasParent.has(n.id));

    // Build tree recursively
    function buildTree(nodeId, visited = new Set()) {
        if (visited.has(nodeId)) return null; // Prevent cycles
        visited.add(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        const tree = {
            id: node.id,
            type: node.data?.subtype || node.type,
            label: node.data?.label || 'Unknown',
            config: {
                region: node.data?.region || 'us-east-1',
                size: node.data?.size || 'auto',
                status: node.data?.status || 'healthy',
            },
            children: [],
        };

        const childIds = children[nodeId] || [];
        tree.children = childIds
            .map(cid => buildTree(cid, new Set(visited)))
            .filter(Boolean);

        return tree;
    }

    const hierarchy = roots.map(r => buildTree(r.id));

    return {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        totalNodes: nodes.length,
        totalEdges: edges.length,
        architecture: hierarchy,
    };
}

/**
 * Deserializes a hierarchical structure back into flat nodes/edges arrays.
 */
function deserializeFromHierarchy(hierarchy) {
    const nodes = [];
    const edges = [];
    let y = 0;

    function flatten(tree, parentId = null, depth = 0) {
        if (!tree) return;

        const nodeId = tree.id || `node-${nodes.length}`;
        nodes.push({
            id: nodeId,
            type: 'systemNode',
            position: { x: depth * 250, y: y * 140 },
            data: {
                subtype: tree.type,
                label: tree.label,
                status: tree.config?.status || 'healthy',
                region: tree.config?.region,
                size: tree.config?.size,
            },
        });
        y++;

        if (parentId) {
            edges.push({
                id: `e-${parentId}-${nodeId}`,
                source: parentId,
                target: nodeId,
                type: 'smoothstep',
            });
        }

        (tree.children || []).forEach(child => flatten(child, nodeId, depth + 1));
    }

    (hierarchy.architecture || []).forEach(root => flatten(root));
    return { nodes, edges };
}

module.exports = { serializeToHierarchy, deserializeFromHierarchy };
