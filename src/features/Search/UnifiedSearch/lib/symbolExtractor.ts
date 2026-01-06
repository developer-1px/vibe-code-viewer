/**
 * CodeSymbol Extractor - Extract searchable items (files + symbols + usages) from parsed AST nodes
 */

import * as ts from 'typescript';
import type { CodeSymbolMetadata } from '../../../../entities/CodeSymbol/model/types.ts';
import { getExports } from '../../../../entities/SourceFileNode/lib/metadata.ts';
import type { SourceFileNode } from '../../../../entities/SourceFileNode/model/types.ts';
import { getFileName } from '../../../../shared/pathUtils.ts';
import type { SearchResult } from '../model/types.ts';

/**
 * Get display name for file
 * For files starting with "index", include parent folder name
 * @example
 * getFileDisplayName('src/shared/tsParser/index.ts') → 'tsParser/index.ts'
 * getFileDisplayName('src/components/Button.tsx') → 'Button.tsx'
 */
function getFileDisplayName(filePath: string): string {
  const fileName = getFileName(filePath);

  // index로 시작하는 파일명은 상위 폴더명 포함
  if (fileName.startsWith('index')) {
    const parts = filePath.split('/');
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}/${fileName}`;
    }
  }

  return fileName;
}

/**
 * Get all identifiers (usages) from a parsed source file
 */
function getIdentifiers(
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
 * Get export information from Export View (no AST traversal!)
 * 🔥 View 기반: Worker가 미리 계산한 Export View 사용
 */
function getExportMap(fullNodeMap: Map<string, SourceFileNode>): Map<string, boolean> {
  const exportMap = new Map<string, boolean>();

  // 🔥 View 조회 (AST 순회 없음!)
  fullNodeMap.forEach((node) => {
    if (node.type !== 'file') return;

    try {
      const { filePath } = node;
      const exports = getExports(node); // View 우선 조회

      exports.forEach((exp) => {
        const key = `${filePath}:${exp.line}`;
        exportMap.set(key, true);
      });
    } catch (_e) {
      // Skip files that fail to parse
    }
  });

  return exportMap;
}

/**
 * Get all searchable items (files + symbols + usages) from the node map
 * Parse each file only once
 */
export function getAllSearchableItems(
  fullNodeMap: Map<string, SourceFileNode>,
  symbolMetadata: Map<string, CodeSymbolMetadata>,
  files: Record<string, string>
): SearchResult[] {
  const results: SearchResult[] = [];
  const declaredSymbols = new Set<string>();

  // Extract export information from all files using TypeScript AST
  // ✅ fullNodeMap의 sourceFile 재사용 (재파싱 제거)
  const exportMap = getExportMap(fullNodeMap);

  // 1. Extract declarations from fullNodeMap and collect symbol names
  // ✅ Worker가 생성한 Symbol 노드 (type/interface/function/const 등) 직접 사용
  // ✅ AST 재순회 없음 - fullNodeMap에 이미 포함됨
  fullNodeMap.forEach((node) => {
    const isFile = node.type === 'file';

    // Skip ROOT nodes (parser metadata nodes)
    if (
      !isFile &&
      (node.id.endsWith('::TEMPLATE_ROOT') || node.id.endsWith('::JSX_ROOT') || node.id.endsWith('::FILE_ROOT'))
    ) {
      return;
    }

    const metadata = symbolMetadata.get(node.id);
    const codeSnippet = metadata?.codeSnippet || node.codeSnippet;

    // Check export status using TypeScript AST-based export map
    const isExported =
      !isFile && node.startLine ? exportMap.get(`${node.filePath}:${node.startLine}`) || false : undefined;

    const uniqueId = isFile ? `file-${node.id}` : `symbol-${node.id}`;
    const name = isFile ? getFileDisplayName(node.filePath) : node.label;

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
  fullNodeMap.forEach((node) => {
    if (!node.id.includes('::')) {
      filesInNodeMap.add(node.filePath);
    }
  });

  // Add files not in dependency graph
  Object.keys(files).forEach((filePath) => {
    if (!filesInNodeMap.has(filePath)) {
      const fileName = getFileDisplayName(filePath);
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
  Object.keys(files).forEach((filePath) => {
    const parts = filePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/');
      if (folderPath) {
        folderSet.add(folderPath);
      }
    }
  });

  folderSet.forEach((folderPath) => {
    const folderName = getFileName(folderPath);
    results.push({
      id: `folder-${folderPath}`,
      type: 'folder',
      name: folderName,
      filePath: folderPath,
      score: 0,
    });
  });

  // 3. Extract all usages from parsed files
  // ✅ fullNodeMap의 sourceFile 재사용 (재파싱 제거)
  // ✅ Usage 추출만 AST 순회 필요 (top-level 선언이 아니므로 Worker에서 수집 불가)
  fullNodeMap.forEach((node) => {
    if (node.type !== 'file' || !node.sourceFile) return;

    try {
      const { sourceFile, filePath, codeSnippet } = node;
      const lines = codeSnippet.split('\n');

      const usages = getIdentifiers(filePath, sourceFile, lines, declaredSymbols);
      results.push(...usages);
    } catch (e) {
      console.warn(`[symbolExtractor] Failed to extract usages from ${node.filePath}:`, e);
    }
  });

  // 4. Remove duplicate usages (same file + same line as declaration)
  const declarationKeys = new Set<string>();
  results.forEach((item) => {
    if (item.type === 'symbol' && item.nodeType !== 'usage' && item.lineNumber) {
      declarationKeys.add(`${item.filePath}:${item.lineNumber}`);
    }
  });

  const deduped = results.filter((item) => {
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
