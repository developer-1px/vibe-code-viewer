/**
 * CodeSymbol Extractor - Extract searchable items (files + symbols + usages) from parsed AST nodes
 */

import * as ts from 'typescript';
import type { SourceFileNode } from '../../../entities/SourceFileNode/model/types';
import type { SearchResult } from '../model/types';
import type { CodeSymbolMetadata } from '../../../entities/CodeSymbol/model/types';

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
 * Extract export information from source file using TypeScript AST
 */
function extractExportMap(files: Record<string, string>): Map<string, boolean> {
  const exportMap = new Map<string, boolean>();

  Object.entries(files).forEach(([filePath, content]) => {
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      function visitNode(node: ts.Node) {
        const isExported = !!(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export);

        if (isExported) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const lineNumber = line + 1;
          const key = `${filePath}:${lineNumber}`;
          exportMap.set(key, true);
        }

        ts.forEachChild(node, visitNode);
      }

      visitNode(sourceFile);
    } catch (e) {
      // Skip files that fail to parse
    }
  });

  return exportMap;
}

/**
 * Extract all searchable items (files + symbols + usages) from the node map
 * Parse each file only once
 */
export function extractAllSearchableItems(
  fullNodeMap: Map<string, SourceFileNode>,
  symbolMetadata: Map<string, CodeSymbolMetadata>,
  files: Record<string, string>
): SearchResult[] {
  const results: SearchResult[] = [];
  const declaredSymbols = new Set<string>();

  // Extract export information from all files using TypeScript AST
  const exportMap = extractExportMap(files);

  // 1. Extract declarations from fullNodeMap and collect symbol names
  fullNodeMap.forEach((node) => {
    const isFile = !node.id.includes('::');

    // Skip ROOT nodes (parser metadata nodes)
    if (!isFile && (
      node.id.endsWith('::TEMPLATE_ROOT') ||
      node.id.endsWith('::JSX_ROOT') ||
      node.id.endsWith('::FILE_ROOT')
    )) {
      return;
    }

    const metadata = symbolMetadata.get(node.id);
    const codeSnippet = metadata?.codeSnippet || node.codeSnippet;

    // Check export status using TypeScript AST-based export map
    const isExported = !isFile && node.startLine
      ? exportMap.get(`${node.filePath}:${node.startLine}`) || false
      : undefined;

    const uniqueId = isFile ? `file-${node.id}` : `symbol-${node.id}`;
    const name = isFile ? (node.filePath.split('/').pop() || node.filePath) : node.label;

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

  // 2. Add orphaned files and folders from virtual file system
  // filesInNodeMap: Track which files are in the dependency graph
  // Orphaned files are files that exist in the project but are not imported/parsed
  const filesInNodeMap = new Set<string>();
  fullNodeMap.forEach(node => {
    if (!node.id.includes('::')) {
      filesInNodeMap.add(node.filePath);
    }
  });

  // Add files not in dependency graph
  Object.keys(files).forEach(filePath => {
    if (!filesInNodeMap.has(filePath)) {
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

  // Extract and add all folders
  const folderSet = new Set<string>();
  Object.keys(files).forEach(filePath => {
    const parts = filePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/');
      if (folderPath) {
        folderSet.add(folderPath);
      }
    }
  });

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

  // 3. Parse each file once and extract all usages
  Object.entries(files).forEach(([filePath, content]) => {
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      const lines = content.split('\n');

      const usages = extractIdentifiers(filePath, sourceFile, lines, declaredSymbols);
      results.push(...usages);
    } catch (e) {
      console.warn(`[symbolExtractor] Failed to parse ${filePath}:`, e);
    }
  });

  // 4. Remove duplicate usages (same file + same line as declaration)
  const declarationKeys = new Set<string>();
  results.forEach(item => {
    if (item.type === 'symbol' && item.nodeType !== 'usage' && item.lineNumber) {
      declarationKeys.add(`${item.filePath}:${item.lineNumber}`);
    }
  });

  const deduped = results.filter(item => {
    if (item.type !== 'symbol' || item.nodeType !== 'usage') return true;

    const key = `${item.filePath}:${item.lineNumber}`;
    return !declarationKeys.has(key);
  });

  // Sort by type priority: file > folder > symbol, then alphabetically
  return deduped.sort((a, b) => {
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

