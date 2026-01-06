/**
 * Copy All Prompt Hook
 */

import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { getItemKey } from '../../DeadCodeAnalyzer/lib/categoryUtils.tsx';
import { deadCodeResultsAtom } from '../../DeadCodeAnalyzer/model/atoms.ts';

export function useCopyAllPrompt() {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAllPrompt = async () => {
    if (!deadCodeResults) return;

    // Generate prompt from all items
    const { generateRefactoringPrompt } = await import('../../../../RefactoringPrompt/lib/promptGenerator.ts');

    // Select all items
    const allItems = [
      ...deadCodeResults.unusedExports,
      ...deadCodeResults.unusedImports,
      ...deadCodeResults.deadFunctions,
      ...deadCodeResults.unusedVariables,
    ];
    const allKeys = new Set(allItems.map(getItemKey));

    const prompt = generateRefactoringPrompt(allKeys, deadCodeResults);

    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return {
    copiedAll,
    handleCopyAllPrompt,
  };
}
