
import React, { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import Sidebar from './widgets/Sidebar/Sidebar';
import Header from './widgets/MainContent/Header.tsx';
import PipelineCanvas from './widgets/PipelineCanvas.tsx';
import JotaiDevTools from './widgets/JotaiDevTools/JotaiDevTools';
import { isSidebarOpenAtom } from './store/atoms';
import { useGraphDataInit } from './hooks/useGraphData';

const App: React.FC = () => {
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom);

  // Initialize and parse graph data (stores in atoms)
  useGraphDataInit();

  // Toggle Sidebar Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vibe-dark text-slate-200 font-sans">
      {/* Left Sidebar - Code Input */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">

        {/* Minimal Header */}
        <Header />

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <PipelineCanvas />
        </div>
      </div>

      {/* Jotai DevTools */}
      <JotaiDevTools />
    </div>
  );
};

export default App;