/**
 * Internal types for renderCodeLinesDirect
 */

import type * as ts from 'typescript';
import type { SegmentKind } from '../../types/codeLine';

export interface SegmentToAdd {
  start: number;
  end: number;
  kinds: SegmentKind[];
  nodeId?: string;
  definedIn?: string;
  isDeclarationName?: boolean;
  tsNode?: ts.Node;
  isDead?: boolean;
}

export interface LinePosition {
  line: number;
  character: number;
}

/**
 * Phase 2-B: Context object to reduce parameter count
 * Groups related rendering context data (13 params → 1 object)
 */
export interface RenderContext {
  // Node metadata
  nodeShortId: string;
  nodeId: string;
  filePath: string;

  // AST analysis results (shared across all identifier processing)
  parameters: Set<string>;
  localVars: Set<string>;
  localIdentifiers: Set<string>;

  // Dependencies
  dependencyMap: Map<string, string>;
  files: Record<string, string>;

  // Helper functions
  getImportSource: (node: any, name: string, files: Record<string, string>, resolvePath: any) => string | null;
  resolvePath: (from: string, to: string, files: Record<string, string>) => string | null;
}

/**
 * 위치를 라인 번호와 오프셋으로 변환
 */
export const getLinePosition = (position: number, sourceFile: ts.SourceFile): LinePosition => {
  return sourceFile.getLineAndCharacterOfPosition(position);
};
