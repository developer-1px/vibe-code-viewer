/**
 * RefactoringPromptDialog
 * 선택된 dead code items를 기반으로 AI 리팩토링 프롬프트를 생성하고 복사/전송하는 다이얼로그
 */

import { Check, Copy, Sparkles, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { DeadCodeResults } from '../Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';
import { generateRefactoringPrompt, type RefactoringPrompt } from './lib/promptGenerator';

export interface RefactoringPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemKeys: Set<string>;
  deadCodeResults: DeadCodeResults;
}

export function RefactoringPromptDialog({
  open,
  onOpenChange,
  selectedItemKeys,
  deadCodeResults,
}: RefactoringPromptDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [refactoringPrompt, setRefactoringPrompt] = React.useState<RefactoringPrompt | null>(null);

  // Generate prompt when dialog opens
  React.useEffect(() => {
    if (open && selectedItemKeys.size > 0) {
      const prompt = generateRefactoringPrompt(selectedItemKeys, deadCodeResults);
      setRefactoringPrompt(prompt);
    }
  }, [open, selectedItemKeys, deadCodeResults]);

  const handleCopy = async () => {
    if (!refactoringPrompt) return;

    try {
      await navigator.clipboard.writeText(refactoringPrompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendToAI = () => {
    // TODO: AI Assistant로 프롬프트 전송 기능 구현
    // 현재는 콘솔에 로그만 출력
    console.log('[RefactoringPromptDialog] Sending to AI:', refactoringPrompt?.prompt);
    alert('AI Assistant 기능은 아직 구현되지 않았습니다.\n프롬프트가 클립보드에 복사되었습니다.');
    handleCopy();
  };

  if (!refactoringPrompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-bg-elevated border border-border-DEFAULT rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-DEFAULT">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-warm-300" />
              <h2 className="text-base font-semibold text-text-primary">AI Refactoring Prompt</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
              <X size={16} />
            </Button>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 border-b border-border-DEFAULT bg-bg-surface">
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>
                Total items: <span className="text-warm-300 font-medium">{refactoringPrompt.itemCount}</span>
              </span>
              {refactoringPrompt.categories.unusedExports > 0 && (
                <span>Unused Exports: {refactoringPrompt.categories.unusedExports}</span>
              )}
              {refactoringPrompt.categories.unusedImports > 0 && (
                <span>Unused Imports: {refactoringPrompt.categories.unusedImports}</span>
              )}
              {refactoringPrompt.categories.deadFunctions > 0 && (
                <span>Dead Functions: {refactoringPrompt.categories.deadFunctions}</span>
              )}
              {refactoringPrompt.categories.unusedVariables > 0 && (
                <span>Unused Variables: {refactoringPrompt.categories.unusedVariables}</span>
              )}
            </div>
          </div>

          {/* Prompt Content */}
          <ScrollArea className="flex-1 p-4">
            <pre className="font-mono text-xs text-text-secondary whitespace-pre-wrap break-words bg-bg-deep rounded-lg p-4 border border-border-light">
              {refactoringPrompt.prompt}
            </pre>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border-DEFAULT">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Prompt
                </>
              )}
            </Button>
            <Button variant="default" size="sm" onClick={handleSendToAI} className="gap-2">
              <Sparkles size={14} />
              Send to AI Assistant
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
