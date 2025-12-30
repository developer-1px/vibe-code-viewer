
import React, { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import Sidebar from './widgets/Sidebar/Sidebar';
import Header from './widgets/MainContent/Header.tsx';
import PipelineCanvas from './widgets/PipelineCanvas.tsx';
import LeftSideToolbar from './widgets/LeftSideToolbar/LeftSideToolbar';
import JotaiDevTools from './widgets/JotaiDevTools/JotaiDevTools';
import { isSidebarOpenAtom, searchModalOpenAtom } from './store/atoms';
import { useGraphDataInit } from './hooks/useGraphData';
import { UnifiedSearchModal } from './features/UnifiedSearch/UnifiedSearchModal';

const App: React.FC = () => {
  const setIsSidebarOpen = useSetAtom(isSidebarOpenAtom);
  const setSearchModalOpen = useSetAtom(searchModalOpenAtom);

  // Track Shift key double-tap for search modal
  const lastShiftPressRef = useRef<number>(0);

  // Initialize and parse graph data (stores in atoms)
  useGraphDataInit();

  // Toggle Sidebar Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }

      // Shift+Shift to open search modal
      if (e.key === 'Shift') {
        const now = Date.now();
        const timeSinceLastPress = now - lastShiftPressRef.current;

        if (timeSinceLastPress < 300) {
          // Double-tap detected
          e.preventDefault();
          setSearchModalOpen(true);
          lastShiftPressRef.current = 0; // Reset
        } else {
          lastShiftPressRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSidebarOpen, setSearchModalOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vibe-dark text-slate-200 font-sans">
      {/* Left Icon Tab Bar */}
      <LeftSideToolbar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Main Layout: Canvas with Floating Sidebar */}
        <div className="flex-1 relative overflow-hidden bg-[#0f172a]">
          {/* Canvas Area */}
          <PipelineCanvas />

          {/* Floating Sidebar */}
          <Sidebar />
        </div>
      </div>

      {/* Jotai DevTools */}
      <JotaiDevTools />

      {/* Unified Search Modal (Shift+Shift) */}
      <UnifiedSearchModal />
    </div>
  );
};

export default App;