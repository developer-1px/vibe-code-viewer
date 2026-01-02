/**
 * IDEView - IDE-style full-screen code viewer with tab system
 * Shows files in tabs like a traditional IDE
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { FileText } from 'lucide-react';
import { openedTabsAtom, activeTabAtom, viewModeAtom, fullNodeMapAtom, filesAtom, outlinePanelOpenAtom, targetLineAtom, deadCodeResultsAtom } from '../../store/atoms';
import { renderCodeLinesDirect } from '../CodeViewer/core/renderer/renderCodeLinesDirect';
import { renderVueFile } from '../CodeViewer/core/renderer/renderVueFile';
import CodeViewer from '../CodeViewer/CodeViewer';
import { getFileName } from '../../shared/pathUtils';
import { TabBar, Tab } from '@/components/ide/TabBar';
import { OutlinePanel } from '@/components/ide/OutlinePanel';
import { extractOutlineStructure } from '../../shared/outlineExtractor';
import { extractDefinitions } from '../../shared/definitionExtractor';
import { useTabNavigation } from '../../features/File/useTabNavigation';

const IDE_HOTKEYS = {
  ESC: 'esc',
  TOGGLE_OUTLINE: 'backquote',
  PREV_TAB: 'mod+bracketleft',
  NEXT_TAB: 'mod+bracketright',
} as const;

const IDEView = () => {
  const [openedTabs, setOpenedTabs] = useAtom(openedTabsAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const files = useAtomValue(filesAtom);
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const [outlinePanelOpen, setOutlinePanelOpen] = useAtom(outlinePanelOpenAtom);
  const setTargetLine = useSetAtom(targetLineAtom);
  const { goToPreviousTab, goToNextTab } = useTabNavigation();

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync activeTab when it changes
  const activeNode = activeTab ? fullNodeMap.get(activeTab) : null;

  // If no active tab but tabs exist, activate the first one
  useEffect(() => {
    if (!activeTab && openedTabs.length > 0) {
      setActiveTab(openedTabs[0]);
    }
  }, [activeTab, openedTabs, setActiveTab]);

  // IDE hotkeys (ref-based scoping - only work when IDE view has focus)
  const ideRef = useHotkeys(Object.values(IDE_HOTKEYS), (e, { hotkey }) => {
    console.log('[IDEView] Hotkey pressed:', hotkey);
    e.preventDefault();

    switch (hotkey) {
      // case IDE_HOTKEYS.ESC:
      //   setViewMode('canvas');
      //   break;
      case IDE_HOTKEYS.TOGGLE_OUTLINE:
        setOutlinePanelOpen(prev => !prev);
        break;
      case IDE_HOTKEYS.PREV_TAB:
        goToPreviousTab();
        break;
      case IDE_HOTKEYS.NEXT_TAB:
        goToNextTab();
        break;
    }
  }, {
    preventDefault: true
  }, [setViewMode, setOutlinePanelOpen, goToPreviousTab, goToNextTab]);

  // Close tab
  const handleCloseTab = (tabPath: string) => {
    const tabIndex = openedTabs.indexOf(tabPath);
    const newTabs = openedTabs.filter(t => t !== tabPath);

    setOpenedTabs(newTabs);

    // If closing active tab, switch to adjacent tab
    if (tabPath === activeTab) {
      if (newTabs.length > 0) {
        // Switch to the tab on the right, or left if it was the last tab
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTab(newTabs[newActiveIndex]);
      } else {
        setActiveTab(null);
      }
    }
  };

  // Process code lines
  const processedLines = useMemo(() => {
    if (!activeNode) return [];

    if (activeNode.filePath.endsWith('.vue')) {
      return renderVueFile(activeNode, files);
    }
    return renderCodeLinesDirect(activeNode, files, deadCodeResults);
  }, [activeNode, files, deadCodeResults]);

  // Extract outline structure from active node
  const outlineNodes = useMemo(() => {
    if (!activeNode) return [];
    return extractOutlineStructure(activeNode);
  }, [activeNode]);

  // Extract definitions from active node (already hierarchical by block scope)
  const definitions = useMemo(() => {
    if (!activeNode) return [];
    return extractDefinitions(activeNode, files);
  }, [activeNode, files]);

  // Scroll to line handler for OutlinePanel
  const handleScrollToLine = (line: number) => {
    if (!activeNode) return;

    // Close outline panel and switch to code view
    setOutlinePanelOpen(false);

    // Set target line for Focus Mode
    setTargetLine({ nodeId: activeNode.id, lineNum: line });

    // Scroll to line after a short delay (to allow render)
    setTimeout(() => {
      if (!scrollContainerRef.current) return;

      const lineElement = scrollContainerRef.current.querySelector(`[data-line-num="${line}"]`);

      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'auto', block: 'center' });
        console.log('[IDEView] Scrolled to line:', line);
      } else {
        console.warn('[IDEView] Line element not found:', line);
      }
    }, 100);
  };

  if (!activeNode && openedTabs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-elevated text-text-tertiary">
        <p>No files open. Use search (Shift+Shift) or click a file in the sidebar to open.</p>
      </div>
    );
  }

  return (
    <div
      ref={ideRef}
      tabIndex={-1}
      className="flex-1 h-full flex flex-col bg-bg-elevated overflow-hidden focus:outline-none"
    >
      {/* LIMN TabBar */}
      <TabBar>
        {openedTabs.map((tabPath) => {
          const tabNode = fullNodeMap.get(tabPath);
          if (!tabNode) return null;

          const fileName = getFileName(tabNode.filePath);
          const isActive = tabPath === activeTab;

          return (
            <Tab
              key={tabPath}
              icon={FileText}
              label={fileName}
              active={isActive}
              dirty={false}
              onClick={() => setActiveTab(tabPath)}
              onClose={() => handleCloseTab(tabPath)}
            />
          );
        })}
      </TabBar>

      {/* Main content area - toggle between Outline and Code */}
      <div className="flex-1 flex overflow-hidden">
        {outlinePanelOpen ? (
          /* Outline Panel (full width) */
          activeNode && (
            <OutlinePanel
              key={activeNode.filePath}
              defaultOpen={true}
              nodes={outlineNodes}
              definitions={definitions}
              onNodeClick={handleScrollToLine}
            />
          )
        ) : (
          /* Scrollable code content (full width) */
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto"
          >
            {activeNode && (
              <CodeViewer
                processedLines={processedLines}
                node={activeNode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IDEView;
