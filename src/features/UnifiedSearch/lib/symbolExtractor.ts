/**
 * Symbol Extractor - Extract searchable items (files + symbols + usages) from parsed AST nodes
 */

import * as ts from 'typescript';
import type { VariableNode } from '../../../entities/SourceFileNode';
import type { SearchResult, SymbolMetadata } from '../model/types';

/**
 * Extract all identifiers (usages) from a parsed source file
 */
function extractIdentifiers(
  filePath: string,
  sourceFile: ts.SourceFile,
  lines: string[],
  declaredSymbols: Set<string>
): SearchResult[] {
  const identifiers: SearchResult[] = [];

  function visit(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      const name = node.text;

      // Only include usages of declared symbols
      if (declaredSymbols.has(name)) {
        const pos = node.getStart(sourceFile);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        const lineNum = line + 1;
        const lineContent = lines[line]?.trim() || '';

        identifiers.push({
          id: `usage-${filePath}:${lineNum}:${character}`,
          type: 'symbol',
          name,
          filePath,
          nodeType: 'usage',
          lineNumber: lineNum,
          score: 0,
          codeSnippet: lineContent,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return identifiers;
}

/**
 * Extract all searchable items (files + symbols + usages) from the node map
 * Parse each file only once
 */
export function extractAllSearchableItems(
  fullNodeMap: Map<string, VariableNode>,
  symbolMetadata: Map<string, SymbolMetadata>,
  files: Record<string, string>
): SearchResult[] {
  const results: SearchResult[] = [];
  const declaredSymbols = new Set<string>();

  // 1. Extract declarations from fullNodeMap and collect symbol names
  let fileCount = 0;
  let symbolCount = 0;

  fullNodeMap.forEach((node) => {
    // 파일 vs 심볼 구분 (먼저 체크)
    const isFile = !node.id.includes('::');

    // Skip ROOT nodes (파서가 만든 메타 노드) - 파일이 아닌 경우만
    if (!isFile && (
      node.id.endsWith('::TEMPLATE_ROOT') ||
      node.id.endsWith('::JSX_ROOT') ||
      node.id.endsWith('::FILE_ROOT')
    )) {
      return;
    }

    if (isFile) fileCount++;
    else symbolCount++;

    const metadata = symbolMetadata.get(node.id);

    // Code snippet (파싱 결과에서 가져옴)
    const codeSnippet = metadata?.codeSnippet || node.codeSnippet;

    // Export 여부 판별 (symbol인 경우만)
    const isExported = !isFile && codeSnippet
      ? /^\s*export\s+(default\s+)?(const|let|var|function|class|interface|type|enum)\s+/.test(codeSnippet)
      : undefined;

    // 유니크 ID 생성: 파일은 경로, 심볼은 node.id 사용
    const uniqueId = isFile
      ? `file-${node.id}`
      : `symbol-${node.id}`;

    // 파일명: 파일인 경우 확장자 포함, 심볼인 경우 label 그대로
    const name = isFile
      ? (node.filePath.split('/').pop() || node.filePath)
      : node.label;

    // Collect declared symbol names for usage extraction
    if (!isFile) {
      declaredSymbols.add(node.label);
    }

    results.push({
      id: uniqueId,
      type: isFile ? 'file' : 'symbol',
      name,
      filePath: node.filePath,
      nodeType: isFile ? undefined : node.type,
      nodeId: isFile ? undefined : node.id,
      lineNumber: isFile ? undefined : node.startLine,
      score: 0,
      typeInfo: metadata?.typeInfo || undefined,
      codeSnippet,
      usageCount: metadata?.usageCount || 0,
      isExported,
    });
  });

  console.log(`[extractAllSearchableItems] Extracted ${fileCount} files, ${symbolCount} symbols from fullNodeMap`);

  // 1.5. Add files and folders from virtual file system
  const filesInNodeMap = new Set<string>();
  fullNodeMap.forEach(node => {
    if (!node.id.includes('::')) {
      filesInNodeMap.add(node.filePath);
    }
  });

  // Extract folders from file paths
  const folderSet = new Set<string>();
  Object.keys(files).forEach(filePath => {
    const parts = filePath.split('/');
    // Build all folder paths (e.g., "src", "src/widgets", "src/widgets/CodeCard")
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/');
      if (folderPath) {
        folderSet.add(folderPath);
      }
    }
  });

  // Add orphaned files (not in dependency graph)
  let orphanedFileCount = 0;
  Object.keys(files).forEach(filePath => {
    if (!filesInNodeMap.has(filePath)) {
      orphanedFileCount++;
      const fileName = filePath.split('/').pop() || filePath;
      results.push({
        id: `file-${filePath}`,
        type: 'file',
        name: fileName,
        filePath: filePath,
        score: 0,
      });
    }
  });

  // Add all folders
  folderSet.forEach(folderPath => {
    const folderName = folderPath.split('/').pop() || folderPath;
    results.push({
      id: `folder-${folderPath}`,
      type: 'folder',
      name: folderName,
      filePath: folderPath,
      score: 0,
    });
  });

  if (orphanedFileCount > 0) {
    console.log(`[extractAllSearchableItems] Added ${orphanedFileCount} orphaned files not in dependency graph`);
  }
  console.log(`[extractAllSearchableItems] Added ${folderSet.size} folders`);

  // 2. Parse each file once and extract all usages
  Object.entries(files).forEach(([filePath, content]) => {
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      const lines = content.split('\n');

      // Extract all identifier usages from this file
      const usages = extractIdentifiers(filePath, sourceFile, lines, declaredSymbols);
      results.push(...usages);
    } catch (e) {
      console.warn(`[extractAllSearchableItems] Failed to parse ${filePath}:`, e);
    }
  });

  const totalFiles = fileCount + orphanedFileCount;
  console.log(`[extractAllSearchableItems] Total results: ${results.length} (${totalFiles} files [${fileCount} in graph + ${orphanedFileCount} orphaned] + ${folderSet.size} folders + ${symbolCount} symbols + usages)`);

  // Sort by type priority: file > folder > symbol, then alphabetically
  return results.sort((a, b) => {
    // Priority: file (0) > folder (1) > symbol (2)
    const typeOrder = { file: 0, folder: 1, symbol: 2 };
    const priorityA = typeOrder[a.type] ?? 3;
    const priorityB = typeOrder[b.type] ?? 3;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.name.localeCompare(b.name);
  });
}

