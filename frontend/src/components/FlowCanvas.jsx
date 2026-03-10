import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    MiniMap,
    useReactFlow,
    SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useDiagramStore from '../store/useDiagramStore';
import SystemNode from './customNodes/SystemNode';
import LinterPanel from './LinterPanel';
import SnapshotPanel from './SnapshotPanel';
import LiveBill from './overlays/LiveBill';
import Legend from './overlays/Legend';

const nodeTypes = { systemNode: SystemNode };

const GRID_SIZE = 20;

export default function FlowCanvas() {
    const wrapperRef = useRef(null);
    const { screenToFlowPosition } = useReactFlow();
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect,
        addNode, setSelectedNode, deleteSelected, undo, redo,
        chaosMode, securityMode, securityFindings,
        getStyledEdges,
    } = useDiagramStore();

    // Compute styled edges for security/cross-region overlays
    const styledEdges = useMemo(() => {
        // Apply cross-region styling to edges
        return edges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            let style = { ...edge.style };
            let animated = edge.animated;
            let className = edge.className || '';

            // Cross-region dashed lines
            if (source && target) {
                const r1 = source.data?.region || 'us-east-1';
                const r2 = target.data?.region || 'us-east-1';
                if (r1 !== r2 && r1 !== 'global' && r2 !== 'global') {
                    style.strokeDasharray = '10 5';
                    animated = true;
                    className = 'cross-region-edge';
                    if (!edge.data?.dead && !edge.data?.rerouted) {
                        style.stroke = '#a78bfa';
                        style.strokeWidth = 2;
                    }
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
        });
    }, [edges, nodes, securityMode, securityFindings]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handler = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, deleteSelected]);

    // ── Drop handler ──
    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData('application/sysdesign');
            if (!raw) return;
            const config = JSON.parse(raw);
            const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            const position = {
                x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
                y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
            };
            addNode({ position, data: config });
        },
        [screenToFlowPosition, addNode],
    );

    // ── Selection ──
    const handleSelectionChange = useCallback(
        ({ nodes: sel }) => {
            setSelectedNode(sel.length === 1 ? sel[0] : null);
        },
        [setSelectedNode],
    );

    return (
        <div className={`w-full h-full relative ${chaosMode ? 'chaos-mode-active' : ''}`} ref={wrapperRef}>
            <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                onSelectionChange={handleSelectionChange}
                fitView
                snapToGrid
                snapGrid={[GRID_SIZE, GRID_SIZE]}
                selectionMode={SelectionMode.Partial}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    style: { stroke: '#64748b', strokeWidth: 2 },
                }}
                connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
                className="bg-slate-900"
            >
                <Background color="#334155" gap={GRID_SIZE} size={1} variant="dots" />
                <MiniMap
                    style={{
                        background: '#1e293b',
                        borderRadius: 8,
                        border: '1px solid rgba(51,65,85,0.6)',
                    }}
                    maskColor="rgba(15, 23, 42, 0.7)"
                    nodeColor={(n) => {
                        // Chaos mode override colors
                        if (n.data?.status === 'killed') return '#ef4444';
                        if (n.data?.status === 'degraded') return '#fbbf24';

                        const sub = n.data?.subtype;
                        const colors = {
                            server: '#3b82f6', lambda: '#8b5cf6',
                            sql: '#f59e0b', nosql: '#f97316', s3: '#ef4444',
                            balancer: '#10b981', gateway: '#06b6d4', cdn: '#14b8a6',
                            cache: '#eab308', queue: '#ec4899', client: '#94a3b8',
                        };
                        return colors[sub] || '#3b82f6';
                    }}
                    zoomable
                    pannable
                />
            </ReactFlow>

            {/* Overlays */}
            <SnapshotPanel />
            <LinterPanel />
            <LiveBill />
            <Legend />

            {/* Chaos Mode Overlay Border */}
            {chaosMode && (
                <div className="absolute inset-0 pointer-events-none border-2 border-red-500/30 rounded-sm z-20">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        CHAOS MODE — Click nodes to simulate failures
                    </div>
                </div>
            )}

            {/* Security Mode Overlay Border */}
            {securityMode && !chaosMode && (
                <div className="absolute inset-0 pointer-events-none border-2 border-violet-500/20 rounded-sm z-20">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-violet-500/90 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full" />
                        SECURITY AUDIT — Reviewing posture
                    </div>
                </div>
            )}
        </div>
    );
}
