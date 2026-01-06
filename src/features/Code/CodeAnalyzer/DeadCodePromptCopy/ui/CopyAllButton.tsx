/**
 * Copy All Prompt Button Component
 */

import { useAtomValue } from 'jotai';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { deadCodeResultsAtom } from '../../DeadCodeAnalyzer/model/atoms.ts';
import { useCopyAllPrompt } from '../lib/useCopyAllPrompt.ts';

export function CopyAllButton() {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const { copiedAll, handleCopyAllPrompt } = useCopyAllPrompt();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 w-5 p-0"
      onClick={handleCopyAllPrompt}
      disabled={!deadCodeResults || deadCodeResults.totalCount === 0}
      title={copiedAll ? 'Copied!' : 'Copy All Prompt'}
    >
      {copiedAll ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
    </Button>
  );
}
