import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import FlowCanvas from './components/FlowCanvas';
import AiSuggestModal from './components/AiSuggestModal';

export default function App() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans antialiased">
      <ReactFlowProvider>
        <Header onAiSuggest={() => setAiOpen(true)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 relative bg-slate-900">
            <FlowCanvas />
          </main>
          <Inspector />
        </div>
        <AiSuggestModal open={aiOpen} onClose={() => setAiOpen(false)} />
      </ReactFlowProvider>
    </div>
  );
}
