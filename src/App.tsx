
import React, { useEffect } from 'react';
import { Provider, useAtomValue, useSetAtom } from 'jotai';
import { HotkeysProvider } from 'react-hotkeys-hook';
import Sidebar from './widgets/Sidebar/Sidebar';
import Header from './widgets/MainContent/Header.tsx';
import PipelineCanvas from './widgets/PipelineCanvas.tsx';
import LeftSideToolbar from './widgets/LeftSideToolbar/LeftSideToolbar';
import JotaiDevTools from './widgets/JotaiDevTools/JotaiDevTools';
import { UnifiedSearchModal } from './features/UnifiedSearch/UnifiedSearchModal';
import { KeyboardShortcuts } from './features/KeyboardShortcuts';
import { store } from './store/store';
import { filesAtom, graphDataAtom, parseErrorAtom } from './store/atoms';
import { parseProject } from './services/codeParser';

const AppContent: React.FC = () => {
  // Parse project when files change
  const files = useAtomValue(filesAtom);
  const setGraphData = useSetAtom(graphDataAtom);
  const setParseError = useSetAtom(parseErrorAtom);

  useEffect(() => {
    try {
      const parsedData = parseProject(files);
      setParseError(null);
      setGraphData(parsedData);
    } catch (e: any) {
      console.warn("Project Parse Error:", e);
      setParseError(e.message || "Syntax Error");
    }
  }, [files, setGraphData, setParseError]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vibe-dark text-slate-200 font-sans">
      {/* 키보드 단축키 관리 */}
      <KeyboardShortcuts />

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

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <HotkeysProvider initiallyActiveScopes={['sidebar']}>
        <AppContent />
      </HotkeysProvider>
    </Provider>
  );
};

export default App;