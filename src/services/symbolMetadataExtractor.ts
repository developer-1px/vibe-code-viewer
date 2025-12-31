/**
 * Symbol Metadata Extractor - Extract type info, snippets, and usage counts
 * Uses TypeScript Language Service to enrich symbols with metadata
 */

import type { VariableNode } from '../entities/SourceFileNode';
import type { SymbolMetadata } from '../store/atoms';
import { getQuickInfoAtPosition } from '../entities/CodeRenderer/lib/tsLanguageService';

/**
 * Node types to exclude from metadata extraction
 */
const EXCLUDED_NODE_TYPES = new Set([
  'template', // TEMPLATE_ROOT, JSX_ROOT, FILE_ROOT
]);

/**
 * Extract first line from code snippet
 */
function extractFirstLine(codeSnippet: string): string {
  const lines = codeSnippet.trim().split('\n');
  return lines[0] || '';
}

/**
 * Count how many times a symbol is used by other nodes
 */
function countUsages(nodeId: string, fullNodeMap: Map<string, VariableNode>): number {
  let count = 0;

  fullNodeMap.forEach((node) => {
    if (node.dependencies.includes(nodeId)) {
      count++;
    }
  });

  return count;
}

/**
 * Determine if file is TSX based on file path
 */
function isTsxFile(filePath: string): boolean {
  return filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
}

/**
 * Extract metadata for all symbols using TS Language Service
 * Called once after parsing completes
 */
export function extractSymbolMetadata(
  fullNodeMap: Map<string, VariableNode>,
  files: Record<string, string>
): Map<string, SymbolMetadata> {
  console.log('[symbolMetadataExtractor] Starting extraction, fullNodeMap size:', fullNodeMap.size);
  const metadata = new Map<string, SymbolMetadata>();

  fullNodeMap.forEach((node) => {
    // Skip excluded node types
    if (EXCLUDED_NODE_TYPES.has(node.type)) {
      console.log('[symbolMetadataExtractor] Skipping excluded type:', node.type, node.id);
      return;
    }

    // Skip root nodes (TEMPLATE_ROOT, JSX_ROOT, FILE_ROOT)
    if (
      node.id.endsWith('::TEMPLATE_ROOT') ||
      node.id.endsWith('::JSX_ROOT') ||
      node.id.endsWith('::FILE_ROOT')
    ) {
      console.log('[symbolMetadataExtractor] Skipping root node:', node.id);
      return;
    }

    // Extract code snippet (first line)
    const codeSnippet = extractFirstLine(node.codeSnippet || '');

    // Count usages (reverse lookup dependencies)
    const usageCount = countUsages(node.id, fullNodeMap);

    // Extract type info using Language Service
    let typeInfo: string | null = null;

    if (node.codeSnippet && node.filePath) {
      const isTsx = isTsxFile(node.filePath);
      const startLine = node.startLine || 1;

      // Try to get type info from the first identifier in the code
      // Position 0 is usually the declaration keyword, so we try position after that
      const firstIdentifierPos = node.codeSnippet.search(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/);

      if (firstIdentifierPos >= 0) {
        typeInfo = getQuickInfoAtPosition(
          node.codeSnippet,
          node.filePath,
          firstIdentifierPos,
          isTsx
        );
      }
    }

    metadata.set(node.id, {
      typeInfo,
      codeSnippet,
      usageCount,
    });
  });

  console.log('[symbolMetadataExtractor] Extraction complete, metadata size:', metadata.size);
  return metadata;
}
