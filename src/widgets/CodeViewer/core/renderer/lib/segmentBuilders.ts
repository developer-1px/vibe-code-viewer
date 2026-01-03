/**
 * Segment 생성 및 조작 순수 함수들
 */

import * as ts from 'typescript';
import type { CodeLine, CodeSegment } from '../../types/codeLine';
import type { SegmentToAdd } from './types';
import { getLinePosition } from './types';

// Development mode flag (Vite injects this at build time)
const __DEV__ = import.meta.env.DEV;

/**
 * 초기 라인 상태 생성
 */
export const createInitialLines = (lineCount: number, startLineNum: number): CodeLine[] => {
  return Array.from({ length: lineCount }, (_, idx) => ({
    num: startLineNum + idx,
    segments: [],
    hasInput: false
  }));
};

/**
 * Segment를 라인에 추가 (Phase 1-3: Mutable for performance)
 *
 * Performance optimization: Mutates line.segments directly instead of creating new arrays
 * Safe because line is never shared externally during parsing
 */
export const addSegmentToLine = (
  line: CodeLine,
  segment: CodeSegment
): void => {
  // Segment 중복 방지: 같은 위치에 같은 텍스트가 있으면 kinds만 병합
  const existing = line.segments.find(
    seg => seg.position === segment.position && seg.text === segment.text
  );

  if (existing) {
    // kinds 병합 (in-place)
    segment.kinds.forEach(kind => {
      if (!existing.kinds.includes(kind)) {
        existing.kinds.push(kind);
      }
    });

    // 다른 속성 업데이트 (in-place)
    existing.nodeId = segment.nodeId || existing.nodeId;
    existing.definedIn = segment.definedIn || existing.definedIn;
    existing.isDeclarationName = segment.isDeclarationName || existing.isDeclarationName;
    existing.tsNode = segment.tsNode || existing.tsNode;
    existing.isDead = segment.isDead || existing.isDead;
  } else {
    // 새 segment 추가 (push instead of spread)
    line.segments.push(segment);
  }
};

/**
 * Segment를 여러 라인에 추가 (Phase 1-3: Mutable for performance)
 *
 * Performance optimization: Mutates lines array directly instead of creating new arrays via map
 * This eliminates O(줄 수 × segment 수) complexity → O(segment 수)
 * Before: 1000 lines × 100 segments = 100,000 unnecessary iterations
 * After: 100 segments = 100 iterations (90% reduction!)
 */
export const addSegmentToLines = (
  lines: CodeLine[],
  sourceFile: ts.SourceFile,
  code: string,
  segmentToAdd: SegmentToAdd,
  deadIdentifiers: Set<string>
): void => {
  const { start, end, kinds, nodeId, definedIn, isDeclarationName, tsNode } = segmentToAdd;

  const startPos = getLinePosition(start, sourceFile);
  const endPos = getLinePosition(end, sourceFile);

  // hasInput 체크
  const shouldMarkInput = !kinds.includes('local-variable') && !kinds.includes('parameter');

  if (startPos.line === endPos.line) {
    // 단일 라인 - 직접 수정 (O(1))
    const line = lines[startPos.line];
    if (!line) return; // Safety check

    const segmentText = code.slice(start, end);

    // ✅ Dead identifier 체크
    const isDead = (
      kinds.includes('identifier') ||
      kinds.includes('local-variable') ||
      kinds.includes('self') ||
      kinds.includes('external-import') ||
      kinds.includes('external-closure') ||
      kinds.includes('external-function')
    ) && deadIdentifiers.has(segmentText);

    // Debug logging only in development mode
    if (__DEV__) {
      if (isDead) {
        console.log(`[addSegmentToLines] ✅ Single-line DEAD identifier: "${segmentText}", kinds:`, JSON.stringify(kinds), 'isDead:', isDead);
      } else if (deadIdentifiers.has(segmentText)) {
        console.log(`[addSegmentToLines] ❌ Dead identifier NOT marked: "${segmentText}", kinds:`, JSON.stringify(kinds), 'has identifier:', kinds.includes('identifier'), 'has external-import:', kinds.includes('external-import'));
      }
    }

    addSegmentToLine(line, {
      text: segmentText,
      kinds,
      nodeId,
      definedIn,
      isDeclarationName,
      position: start,
      tsNode,
      isDead
    });

    if (shouldMarkInput) {
      line.hasInput = true;
    }

    return;
  }

  // 멀티라인 - 관련된 라인들만 수정 (O(라인 범위))
  for (let lineNum = startPos.line; lineNum <= endPos.line; lineNum++) {
    const line = lines[lineNum];
    if (!line) continue; // Safety check

    const lineStart = sourceFile.getPositionOfLineAndCharacter(lineNum, 0);
    const nextLineStart = lineNum < lines.length - 1
      ? sourceFile.getPositionOfLineAndCharacter(lineNum + 1, 0)
      : code.length;

    const segStart = Math.max(start, lineStart);
    const segEnd = Math.min(end, nextLineStart - 1);

    if (segStart >= segEnd) continue;

    const segmentText = code.slice(segStart, segEnd);

    // ✅ Dead identifier 체크
    const isDead = (
      kinds.includes('identifier') ||
      kinds.includes('local-variable') ||
      kinds.includes('self') ||
      kinds.includes('external-import') ||
      kinds.includes('external-closure') ||
      kinds.includes('external-function')
    ) && deadIdentifiers.has(segmentText);

    // Debug logging only in development mode
    if (__DEV__) {
      if (isDead) {
        console.log(`[addSegmentToLines] ✅ Multi-line DEAD identifier: "${segmentText}", kinds:`, kinds, 'isDead:', isDead);
      } else if (deadIdentifiers.has(segmentText)) {
        console.log(`[addSegmentToLines] ❌ Dead identifier NOT marked: "${segmentText}", kinds:`, kinds, 'has identifier:', kinds.includes('identifier'), 'has external-import:', kinds.includes('external-import'));
      }
    }

    addSegmentToLine(line, {
      text: segmentText,
      kinds: [...kinds],  // Copy kinds array to prevent mutation
      nodeId,
      definedIn,
      isDeclarationName,
      position: segStart,
      tsNode,
      isDead
    });

    if (lineNum === startPos.line && shouldMarkInput) {
      line.hasInput = true;
    }
  }
};

/**
 * 라인의 segments를 정렬하고 빈 공간을 'text'로 채우기
 */
export const fillLineGaps = (
  line: CodeLine,
  lineText: string,
  sourceFile: ts.SourceFile
): CodeLine => {
  // Segments를 position 기준으로 정렬
  const sortedSegments = [...line.segments].sort(
    (a, b) => (a.position || 0) - (b.position || 0)
  );

  // 빈 공간을 'text' segment로 채우기
  const filledSegments: CodeSegment[] = [];
  let cursor = 0;

  sortedSegments.forEach(seg => {
    const segPos = getLinePosition(seg.position || 0, sourceFile);
    const segOffset = segPos.character;

    if (segOffset > cursor) {
      // 앞의 빈 공간
      filledSegments.push({
        text: lineText.slice(cursor, segOffset),
        kinds: ['text']
      });
    }

    filledSegments.push(seg);
    cursor = segOffset + seg.text.length;
  });

  // 남은 텍스트
  if (cursor < lineText.length) {
    filledSegments.push({
      text: lineText.slice(cursor),
      kinds: ['text']
    });
  }

  // Segments가 없으면 전체 라인을 text로
  return {
    ...line,
    segments: filledSegments.length > 0
      ? filledSegments
      : [{ text: lineText, kinds: ['text'] }]
  };
};

/**
 * 모든 라인의 빈 공간 채우기
 */
export const finalizeAllLines = (
  lines: CodeLine[],
  lineTexts: string[],
  sourceFile: ts.SourceFile
): CodeLine[] => {
  return lines.map((line, idx) =>
    fillLineGaps(line, lineTexts[idx], sourceFile)
  );
};
