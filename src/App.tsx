
import React, { useEffect } from 'react';
import { Provider, useAtomValue, useSetAtom } from 'jotai';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { ThemeProvider } from './app/theme';
import Sidebar from './widgets/Sidebar/Sidebar';
import Header from './widgets/MainContent/Header.tsx';
import PipelineCanvas from './widgets/PipelineCanvas.tsx';
import IDEView from './widgets/IDEView/IDEView';
import LeftSideToolbar from './widgets/LeftSideToolbar/LeftSideToolbar';
import JotaiDevTools from './widgets/JotaiDevTools/JotaiDevTools';
import { UnifiedSearchModal } from './features/UnifiedSearch';
import { KeyboardShortcuts } from './features/KeyboardShortcuts';
import { WorkspacePersistence } from './features/WorkspacePersistence';
import { store } from './store/store';
import { filesAtom, graphDataAtom, parseErrorAtom, viewModeAtom } from './store/atoms';
import { parseProject } from '@/shared/codeParser';

const AppContent: React.FC = () => {
  // Parse project when files change
  const files = useAtomValue(filesAtom);
  const setGraphData = useSetAtom(graphDataAtom);
  const setParseError = useSetAtom(parseErrorAtom);
  const viewMode = useAtomValue(viewModeAtom);

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
    <div className="flex h-screen w-screen overflow-hidden bg-theme-background text-theme-text-primary font-sans">
      {/* Workspace persistence (save/restore state) */}
      {/*<WorkspacePersistence />*/}

      {/* 키보드 단축키 관리 */}
      <KeyboardShortcuts />

      {/* Left Icon Tab Bar */}
      <LeftSideToolbar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Main Layout: Canvas with Floating Sidebar OR IDE View with Sidebar */}
        <div className="flex-1 relative overflow-hidden bg-theme-background">
          {viewMode === 'canvas' ? (
            <>
              {/* Canvas Area */}
              <PipelineCanvas />

              {/* Floating Sidebar */}
              <Sidebar />
            </>
          ) : (
            /* IDE View with Sidebar */
            <div className="flex h-full w-full">
              {/* Sidebar (fixed on left) */}
              <Sidebar />

              {/* IDE View (main content) */}
              <IDEView />
            </div>
          )}
        </div>
      </div>

      {/* Jotai DevTools */}
      {/*<JotaiDevTools />*/}

      {/* Unified Search Modal (Shift+Shift) */}
      <UnifiedSearchModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider initialTheme="default">
        <HotkeysProvider initiallyActiveScopes={['sidebar']}>
          <AppContent />
        </HotkeysProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;