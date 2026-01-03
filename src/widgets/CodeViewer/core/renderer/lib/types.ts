/**
 * Internal types for renderCodeLinesDirect
 */

import * as ts from 'typescript';
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
 * 위치를 라인 번호와 오프셋으로 변환
 */
export const getLinePosition = (
  position: number,
  sourceFile: ts.SourceFile
): LinePosition => {
  return sourceFile.getLineAndCharacterOfPosition(position);
};
