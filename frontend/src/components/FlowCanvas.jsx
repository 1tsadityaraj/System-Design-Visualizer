import React, { useCallback, useRef, useEffect } from 'react';
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

const nodeTypes = { systemNode: SystemNode };

const GRID_SIZE = 20;

export default function FlowCanvas() {
    const wrapperRef = useRef(null);
    const { screenToFlowPosition } = useReactFlow();
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect,
        addNode, setSelectedNode, deleteSelected, undo, redo,
    } = useDiagramStore();

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
            // Snap to grid
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
        <div className="w-full h-full relative" ref={wrapperRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
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
        </div>
    );
}
