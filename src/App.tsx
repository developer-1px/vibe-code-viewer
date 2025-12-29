
import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { Sidebar } from './widgets/Sidebar';
import Header from './widgets/MainContent/Header.tsx';
import PipelineCanvas from './widgets/PipelineCanvas.tsx';
import JotaiDevTools from './widgets/JotaiDevTools/JotaiDevTools';
import { isSidebarOpenAtom } from './store/atoms';
import { useGraphDataInit } from './hooks/useGraphData';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);

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
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative z-50 ${isSidebarOpen ? 'w-[400px]' : 'w-0'}`}
      >
        <div className="w-[400px] h-full">
          <Sidebar />
        </div>
      </div>

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