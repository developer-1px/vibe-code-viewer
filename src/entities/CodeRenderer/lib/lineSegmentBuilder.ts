/**
 * Segment를 라인별로 변환하는 순수 함수들
 */

import * as ts from 'typescript';
import type { CodeLine, CodeSegment, SegmentKind } from '../model/types';

export interface SegmentData {
  start: number;
  end: number;
  kinds: Set<SegmentKind>;
  nodeId?: string;
  definedIn?: string;
  isDeclarationName?: boolean;
  position?: number;
}

/**
 * Segment를 라인별로 분류
 */
export function groupSegmentsByLine(
  segmentMap: Map<string, SegmentData>,
  sourceFile: ts.SourceFile,
  lines: string[],
  processedCode: string
): Map<number, SegmentData[]> {
  const segmentsByLine = new Map<number, SegmentData[]>();

  segmentMap.forEach((seg) => {
    const startPos = sourceFile.getLineAndCharacterOfPosition(seg.start);
    const endPos = sourceFile.getLineAndCharacterOfPosition(seg.end);

    // 같은 줄이면 직접 추가
    if (startPos.line === endPos.line) {
      const lineSegs = segmentsByLine.get(startPos.line) || [];
      lineSegs.push(seg);
      segmentsByLine.set(startPos.line, lineSegs);
    } else {
      // 멀티라인이면 각 줄별로 분할
      for (let currentLine = startPos.line; currentLine <= endPos.line; currentLine++) {
        const lineStart = sourceFile.getPositionOfLineAndCharacter(currentLine, 0);
        const lineEnd =
          currentLine < lines.length - 1
            ? sourceFile.getPositionOfLineAndCharacter(currentLine + 1, 0) - 1
            : processedCode.length;

        const segStart = Math.max(seg.start, lineStart);
        const segEnd = Math.min(seg.end, lineEnd);

        if (segStart < segEnd) {
          const lineSegs = segmentsByLine.get(currentLine) || [];
          lineSegs.push({
            ...seg,
            kinds: new Set(seg.kinds), // Set 복사
            start: segStart,
            end: segEnd
          });
          segmentsByLine.set(currentLine, lineSegs);
        }
      }
    }
  });

  return segmentsByLine;
}

/**
 * 라인의 segment 배열을 CodeSegment 배열로 변환
 */
export function buildLineSegments(
  lineText: string,
  lineSegs: SegmentData[],
  sourceFile: ts.SourceFile,
  processedCode: string
): CodeSegment[] {
  if (lineSegs.length === 0) {
    return [{ text: lineText, kinds: ['text'] }];
  }

  // start 위치 기준으로 정렬
  lineSegs.sort((a, b) => a.start - b.start);

  const newSegments: CodeSegment[] = [];
  let cursor = 0;

  lineSegs.forEach(seg => {
    const segPos = sourceFile.getLineAndCharacterOfPosition(seg.start);
    const segOffset = segPos.character;

    if (segOffset > cursor) {
      // 토큰 앞의 텍스트
      newSegments.push({
        text: lineText.slice(cursor, segOffset),
        kinds: ['text']
      });
    }

    // segment 추가
    const text = processedCode.slice(seg.start, seg.end);
    newSegments.push({
      text,
      kinds: Array.from(seg.kinds),
      nodeId: seg.nodeId,
      definedIn: seg.definedIn,
      isDeclarationName: seg.isDeclarationName,
      position: seg.position
    });
    cursor = segOffset + text.length;
  });

  // 남은 텍스트
  if (cursor < lineText.length) {
    newSegments.push({
      text: lineText.slice(cursor),
      kinds: ['text']
    });
  }

  return newSegments;
}

/**
 * Segment에서 hasInput 플래그 계산
 */
export function calculateHasInput(seg: SegmentData): boolean {
  const kindsArray = Array.from(seg.kinds);
  return !kindsArray.includes('local-variable') && !kindsArray.includes('parameter');
}

/**
 * CodeLine 배열을 segments로 채우기
 */
export function populateLineSegments(
  result: CodeLine[],
  lines: string[],
  segmentsByLine: Map<number, SegmentData[]>,
  sourceFile: ts.SourceFile,
  processedCode: string
): void {
  result.forEach((line, idx) => {
    const lineText = lines[idx];
    const lineSegs = segmentsByLine.get(idx) || [];

    // Segments 빌드
    line.segments = buildLineSegments(lineText, lineSegs, sourceFile, processedCode);

    // hasInput 체크
    lineSegs.forEach(seg => {
      if (calculateHasInput(seg)) {
        line.hasInput = true;
      }
    });
  });
}
