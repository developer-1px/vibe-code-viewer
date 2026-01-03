/**
 * Re-analyze Button Component
 */
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAtomValue } from 'jotai';
import { graphDataAtom } from '../../../app/model/atoms';
import { useDeadCodeAnalysis } from '../lib/useDeadCodeAnalysis';

export function AnalyzeButton() {
  const graphData = useAtomValue(graphDataAtom);
  const { isAnalyzing, reanalyze } = useDeadCodeAnalysis();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 w-5 p-0"
      onClick={reanalyze}
      disabled={isAnalyzing || !graphData}
      title={isAnalyzing ? "Analyzing..." : "Re-analyze"}
    >
      {isAnalyzing ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <AlertTriangle size={12} />
      )}
    </Button>
  );
}
