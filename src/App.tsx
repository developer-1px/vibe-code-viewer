import { Provider, useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { UnifiedSearchModal } from '@/features/Search/UnifiedSearch/ui/UnifiedSearchModal';
import { parseProject } from '@/shared/tsParser/parseProject';
import AppSidebar from '@/widgets/AppSidebar/AppSidebar';
import {
  filesAtom,
  fullNodeMapAtom,
  graphDataAtom,
  parseErrorAtom,
  rightPanelOpenAtom,
  viewModeAtom,
} from './app/model/atoms';
import { store } from './app/model/store';
import { ThemeProvider } from './app/theme/ThemeProvider';
import { DefinitionPanel } from './components/ide/DefinitionPanel';
import { activeTabAtom } from './features/File/OpenFiles/model/atoms';
import { KeyboardShortcuts } from './features/KeyboardShortcuts/KeyboardShortcuts';
import { extractDefinitions } from './shared/definitionExtractor';
import { AppActivityBar } from './widgets/AppActivityBar/AppActivityBar';
import { AppStatusBar } from './widgets/AppStatusBar/AppStatusBar';
import { AppTitleBar } from './widgets/AppTitleBar/AppTitleBar';
import CodeDocView from './widgets/CodeDocView/CodeDocView';
import { DeadCodePanel } from './widgets/DeadCodePanel/DeadCodePanel';
import { deadCodePanelOpenAtom } from './widgets/DeadCodePanel/model/atoms';
import IDEScrollView from './widgets/IDEScrollView/IDEScrollView';
import PipelineCanvas from './widgets/PipelineCanvas/PipelineCanvas.tsx';

const AppContent: React.FC = () => {
  // Parse project when files change
  const files = useAtomValue(filesAtom);
  const setGraphData = useSetAtom(graphDataAtom);
  const setParseError = useSetAtom(parseErrorAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const deadCodePanelOpen = useAtomValue(deadCodePanelOpenAtom);
  const rightPanelOpen = useAtomValue(rightPanelOpenAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);

  useEffect(() => {
    try {
      const parsedData = parseProject(files);
      setParseError(null);
      setGraphData(parsedData);
    } catch (e: any) {
      console.warn('Project Parse Error:', e);
      setParseError(e.message || 'Syntax Error');
    }
  }, [files, setGraphData, setParseError]);

  // Extract definitions for current active file
  const definitions = useMemo(() => {
    if (!activeTab || !fullNodeMap.has(activeTab)) return [];
    const node = fullNodeMap.get(activeTab);
    if (!node) return [];
    return extractDefinitions(node, files);
  }, [activeTab, fullNodeMap, files]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-deep text-text-primary select-none">
      {/* Workspace persistence (save/restore state) */}
      {/*<WorkspacePersistence />*/}

      {/* 키보드 단축키 관리 */}
      <KeyboardShortcuts />

      {/* Title Bar */}
      <AppTitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <AppActivityBar />

        {/* Left Sidebar Area: DeadCodePanel or AppSidebar (File Explorer) */}
        {deadCodePanelOpen ? <DeadCodePanel /> : <AppSidebar />}

        {/* Main Content Area: Canvas or IDEScrollView or CodeDocView */}
        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'canvas' && <PipelineCanvas />}
          {viewMode === 'ide' && <IDEScrollView />}
          {viewMode === 'codeDoc' && <CodeDocView />}
        </div>

        {/* Right Sidebar: DefinitionPanel */}
        {rightPanelOpen && <DefinitionPanel symbols={definitions} />}
      </div>

      {/* Status Bar */}
      <AppStatusBar />

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
        <HotkeysProvider>
          <AppContent />
        </HotkeysProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
