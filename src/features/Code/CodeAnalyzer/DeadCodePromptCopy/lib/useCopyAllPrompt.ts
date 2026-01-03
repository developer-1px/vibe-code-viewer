/**
 * Copy All Prompt Hook
 */
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { deadCodeResultsAtom } from '../../DeadCodeAnalyzer/model/atoms';
import { getItemKey } from '../../DeadCodeAnalyzer/lib/categoryUtils';

export function useCopyAllPrompt() {
  const deadCodeResults = useAtomValue(deadCodeResultsAtom);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAllPrompt = async () => {
    if (!deadCodeResults) return;

    // Generate prompt from all items
    const { generateRefactoringPrompt } = await import('../../RefactoringPrompt/lib/promptGenerator');

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
