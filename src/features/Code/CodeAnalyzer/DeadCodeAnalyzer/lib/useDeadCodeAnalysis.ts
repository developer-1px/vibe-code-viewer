/**
 * Dead Code Analysis Hook
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { graphDataAtom } from '../../../../../app/model/atoms.ts';
import { analyzeDeadCode } from '../../../../../shared/deadCodeAnalyzer.ts';
import { deadCodeResultsAtom, isAnalyzingAtom, selectedDeadCodeItemsAtom } from '../model/atoms.ts';

export function useDeadCodeAnalysis() {
  const graphData = useAtomValue(graphDataAtom);
  const [deadCodeResults, setDeadCodeResults] = useAtom(deadCodeResultsAtom);
  const [isAnalyzing, setIsAnalyzing] = useAtom(isAnalyzingAtom);
  const setSelectedItems = useSetAtom(selectedDeadCodeItemsAtom);

  // Analyze dead code on mount
  useEffect(() => {
    if (graphData && !deadCodeResults) {
      setIsAnalyzing(true);
      // Run analysis in next tick to avoid blocking UI
      setTimeout(() => {
        const results = analyzeDeadCode(graphData);
        setDeadCodeResults(results);
        setIsAnalyzing(false);
      }, 0);
    }
  }, [graphData, deadCodeResults, setDeadCodeResults, setIsAnalyzing]);

  const reanalyze = () => {
    setIsAnalyzing(true);
    setDeadCodeResults(null);
    setSelectedItems(new Set());
    setTimeout(() => {
      if (graphData) {
        const results = analyzeDeadCode(graphData);
        setDeadCodeResults(results);
      }
      setIsAnalyzing(false);
    }, 0);
  };

  return {
    isAnalyzing,
    deadCodeResults,
    reanalyze,
  };
}
