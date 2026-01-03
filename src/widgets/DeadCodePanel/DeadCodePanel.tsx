/**
 * DeadCodePanel - Dead Code Analyzer Panel Container
 * Provides panel layout for dead code exploration
 */
import { useState, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Sidebar } from '@/components/ide/Sidebar';
import { deadCodeResultsAtom, selectedDeadCodeItemsAtom } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/model/atoms';
import { useDeadCodeAnalysis } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/useDeadCodeAnalysis';
import { RefactoringPromptDialog } from '../../features/RefactoringPrompt/RefactoringPromptDialog';
import { DeadCodePanelHeader } from './ui/DeadCodePanelHeader';
import { DeadCodePanelSummary } from './ui/DeadCodePanelSummary';
import { DeadCodeExplorer } from '../DeadCodeExplorer/DeadCodeExplorer';
import IDEScrollView from '../IDEScrollView/IDEScrollView';

export function DeadCodePanel({ className }: { className?: string }) {
  useDeadCodeAnalysis(); // Auto-analyze on mount
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const selectedItems = useAtomValue(selectedDeadCodeItemsAtom);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 좌측: Dead Code Panel */}
      <div ref={containerRef} tabIndex={0} className="relative focus:outline-none">
        <Sidebar
          resizable
          defaultWidth={280}
          minWidth={200}
          maxWidth={600}
          className="h-full shadow-2xl"
        >
          <Sidebar.Header>
            <DeadCodePanelHeader />
          </Sidebar.Header>

          <DeadCodePanelSummary />
          <DeadCodeExplorer containerRef={containerRef} />

          {/* Generate Prompt Button */}
          {deadCodeResults && selectedItems.size > 0 && (
            <div className="p-3 border-t border-border-DEFAULT">
              <Button
                variant="default"
                size="sm"
                className="w-full justify-center gap-2"
                onClick={() => setShowPromptDialog(true)}
              >
                <Sparkles size={14} />
                Generate AI Refactoring Prompt ({selectedItems.size})
              </Button>
            </div>
          )}
        </Sidebar>

        {/* Refactoring Prompt Dialog */}
        {deadCodeResults && (
          <RefactoringPromptDialog
            open={showPromptDialog}
            onOpenChange={setShowPromptDialog}
            selectedItemKeys={selectedItems}
            deadCodeResults={deadCodeResults}
          />
        )}
      </div>

      {/* 우측: IDEScrollView */}
      <IDEScrollView />
    </div>
  );
}

export default DeadCodePanel;
