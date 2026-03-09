import React, { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import useDiagramStore from '../store/useDiagramStore';
import { generateDockerCompose, generateTerraform, downloadFile } from '../utils/iacGenerator';
import * as htmlToImage from 'html-to-image';
import {
    Undo, Redo, ZoomIn, ZoomOut, Maximize,
    Download, Wand2, Rocket, Play, Square,
    ChevronDown, Image, FileJson, FileCode, Info
} from 'lucide-react';
import AboutModal from './AboutModal';

export default function Header({ onAiSuggest }) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const { nodes, edges, isAnimating, past, future, undo, redo, toggleAnimation } = useDiagramStore();
    const [exportOpen, setExportOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setExportOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const exportPng = () => {
        const el = document.querySelector('.react-flow');
        if (!el) return;
        htmlToImage.toPng(el, {
            filter: (n) => !(n?.classList?.contains('react-flow__minimap') || n?.classList?.contains('react-flow__controls') || n?.classList?.contains('react-flow__panel')),
            backgroundColor: '#0f172a',
        }).then((url) => { const a = document.createElement('a'); a.download = 'architecture.png'; a.href = url; a.click(); });
        setExportOpen(false);
    };

    const exportJson = () => { downloadFile(JSON.stringify({ nodes, edges }, null, 2), 'architecture.json'); setExportOpen(false); };
    const exportDocker = () => { downloadFile(generateDockerCompose(nodes, edges), 'docker-compose.yml'); setExportOpen(false); };
    const exportTf = () => { downloadFile(generateTerraform(nodes), 'main.tf'); setExportOpen(false); };

    return (
        <header className="h-12 border-b border-slate-700/60 bg-slate-900/95 backdrop-blur-sm flex items-center justify-between px-4 text-white z-50">
            {/* Logo */}
            <div className="flex items-center gap-2.5 min-w-[200px]">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Rocket size={14} />
                </div>
                <span className="font-semibold text-[14px] tracking-tight">SysDesign</span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-700/50">v1.0</span>
            </div>

            {/* Center Toolbar */}
            <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/40">
                <Btn icon={Undo} onClick={undo} disabled={past.length === 0} tip="Undo (⌘Z)" />
                <Btn icon={Redo} onClick={redo} disabled={future.length === 0} tip="Redo (⌘⇧Z)" />
                <Sep />
                <Btn icon={ZoomIn} onClick={() => zoomIn()} tip="Zoom In" />
                <Btn icon={ZoomOut} onClick={() => zoomOut()} tip="Zoom Out" />
                <Btn icon={Maximize} onClick={() => fitView({ padding: 0.2 })} tip="Fit to Screen" />
                <Sep />
                <Btn
                    icon={isAnimating ? Square : Play}
                    onClick={toggleAnimation}
                    active={isAnimating}
                    tip={isAnimating ? 'Stop Traffic' : 'Simulate Traffic'}
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 min-w-[200px] justify-end">
                {/* Collab Avatars */}
                <div className="flex -space-x-1.5 mr-1">
                    <Avatar initials="AD" color="#10b981" />
                    <Avatar initials="JD" color="#f97316" />
                </div>

                {/* Export Dropdown */}
                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setExportOpen(!exportOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-lg text-[13px] font-medium transition-colors"
                    >
                        <Download size={13} /> Export <ChevronDown size={11} className="text-slate-500" />
                    </button>
                    {exportOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 rounded-lg shadow-2xl overflow-hidden z-50 animate-slide-down">
                            <DropItem icon={Image} color="#f472b6" label="Export as PNG" onClick={exportPng} />
                            <DropItem icon={FileJson} color="#fbbf24" label="Export as JSON" onClick={exportJson} />
                            <div className="h-px bg-slate-700/40 mx-2" />
                            <DropItem icon={FileCode} color="#60a5fa" label="Docker Compose" onClick={exportDocker} />
                            <DropItem icon={FileCode} color="#a78bfa" label="Terraform (HCL)" onClick={exportTf} />
                        </div>
                    )}
                </div>

                {/* About Button */}
                <button
                    onClick={() => setAboutOpen(true)}
                    className="flex items-center justify-center w-8 h-8 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="About Architecture Rules"
                >
                    <Info size={14} />
                </button>

                {/* AI Suggest */}
                <button
                    onClick={onAiSuggest}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-lg text-[13px] font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                >
                    <Wand2 size={13} /> AI Suggest
                </button>
            </div>

            {/* Render Modal Outside of Header Layout Flow */}
            <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </header>
    );
}

// ── Small sub-components ──
function Btn({ icon: Icon, onClick, disabled, active, tip }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={tip}
            className={`p-1.5 rounded transition-colors ${active ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'} disabled:opacity-25 disabled:pointer-events-none`}
        >
            <Icon size={15} />
        </button>
    );
}

function Sep() {
    return <div className="w-px h-4 bg-slate-700/40 mx-0.5" />;
}

function Avatar({ initials, color }) {
    return (
        <div
            className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
        >
            {initials}
        </div>
    );
}

function DropItem({ icon: Icon, color, label, onClick }) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/40 text-[13px] text-left transition-colors text-slate-300 hover:text-white">
            <Icon size={14} style={{ color }} />
            {label}
        </button>
    );
}
