/**
 * DeadCodePanel Header Component
 */

import { useSetAtom } from 'jotai';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AnalyzeButton } from '@/features/Code/CodeAnalyzer/DeadCodeAnalyzer/ui/AnalyzeButton';
import { CopyAllButton } from '@/features/Code/CodeAnalyzer/DeadCodePromptCopy/ui/CopyAllButton';
import { deadCodePanelOpenAtom } from '../model/atoms';

export function DeadCodePanelHeader() {
  const setDeadCodePanelOpen = useSetAtom(deadCodePanelOpenAtom);

  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-DEFAULT">
      {/* Left: Icon + Title */}
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={12} className="text-warm-300" />
        <span className="text-2xs font-medium text-text-primary uppercase tracking-wide">Dead Code</span>
      </div>

      {/* Right: Buttons */}
      <div className="flex items-center gap-1">
        <AnalyzeButton />
        <CopyAllButton />
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDeadCodePanelOpen(false)}>
          <X size={12} />
        </Button>
      </div>
    </div>
  );
}
