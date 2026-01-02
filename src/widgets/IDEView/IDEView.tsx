/**
 * IDEView - IDE-style full-screen code viewer with tab system
 * Shows files in tabs like a traditional IDE
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { FileText } from 'lucide-react';
import { openedTabsAtom, activeTabAtom, viewModeAtom, fullNodeMapAtom, filesAtom, outlinePanelOpenAtom } from '../../store/atoms';
import { renderCodeLinesDirect } from '../CodeViewer/core/renderer/renderCodeLinesDirect';
import { renderVueFile } from '../CodeViewer/core/renderer/renderVueFile';
import CodeViewer from '../CodeViewer/CodeViewer';
import { getFileName } from '../../shared/pathUtils';
import { TabBar, Tab } from '@/components/ide/TabBar';
import { OutlinePanel } from '@/components/ide/OutlinePanel';
import { extractOutlineStructure } from '../../shared/outlineExtractor';

const IDEView = () => {
  const [openedTabs, setOpenedTabs] = useAtom(openedTabsAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const fullNodeMap = useAtomValue(fullNodeMapAtom);
  const files = useAtomValue(filesAtom);
  const setViewMode = useSetAtom(viewModeAtom);
  const outlinePanelOpen = useAtomValue(outlinePanelOpenAtom);

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

  // Go back to canvas view
  const handleBackToCanvas = () => {
    setViewMode('canvas');
  };

  // ESC key to go back to canvas
  useHotkeys('esc', handleBackToCanvas, { enableOnFormTags: true });

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
    return renderCodeLinesDirect(activeNode, files);
  }, [activeNode, files]);

  // Extract outline structure from active node
  const outlineNodes = useMemo(() => {
    if (!activeNode) return [];
    return extractOutlineStructure(activeNode);
  }, [activeNode]);

  // Scroll to line handler for OutlinePanel
  const handleScrollToLine = (line: number) => {
    if (!scrollContainerRef.current) return;

    // Find the code line element by data-line-num attribute
    const lineElement = scrollContainerRef.current.querySelector(`[data-line-num="${line}"]`);

    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log('[IDEView] Scrolled to line:', line);
    } else {
      console.warn('[IDEView] Line element not found:', line);
    }
  };

  if (!activeNode && openedTabs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-elevated text-text-tertiary">
        <p>No files open. Use search (Shift+Shift) or click a file in the sidebar to open.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-bg-elevated overflow-hidden">
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

      {/* Main content area with editor and outline panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scrollable code content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {activeNode && (
            <CodeViewer
              processedLines={processedLines}
              node={activeNode}
            />
          )}
        </div>

        {/* Outline Panel (right side) */}
        {outlinePanelOpen && activeNode && (
          <OutlinePanel
            defaultOpen={true}
            nodes={outlineNodes}
            onNodeClick={handleScrollToLine}
          />
        )}
      </div>
    </div>
  );
};

export default IDEView;
