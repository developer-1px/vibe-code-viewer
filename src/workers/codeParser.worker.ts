/**
 * codeParser.worker.ts - Phase C: Web Worker for AST Parsing
 * 메인 스레드를 차단하지 않고 백그라운드에서 TypeScript/Vue 파싱
 */

import * as ts from 'typescript';
import type { CodeLine } from '../widgets/CodeViewer/core/types';

// Worker 메시지 타입 정의
interface ParseRequest {
  type: 'parse';
  filePath: string;
  content: string;
  files: Record<string, string>;
  deadCodeResults: any; // DeadCodeAnalysis 타입
}

interface ParseResponse {
  type: 'result';
  filePath: string;
  lines: CodeLine[];
  parseTime: number;
}

// Worker 환경에서는 renderCodeLinesDirect를 직접 import할 수 없으므로
// 핵심 파싱 로직만 복사 (또는 shared로 분리 필요)
// 임시로 간단한 파서 구현

function parseInWorker(filePath: string, content: string, _files: Record<string, string>): CodeLine[] {
  // TypeScript AST 파싱
  const _sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const lines = content.split('\n');

  // 간단한 plaintext 형태로 반환 (나중에 full parser로 확장)
  return lines.map((lineText, idx) => ({
    num: idx + 1,
    text: lineText,
    segments: [
      {
        text: lineText,
        style: {
          className: 'text-text-primary',
        },
      },
    ],
    hasDeclarationKeyword: false,
    tokens: [],
    dependencyTokens: [],
    localVariables: new Set<string>(),
  }));
}

// Worker 메시지 핸들러
self.addEventListener('message', (event: MessageEvent<ParseRequest>) => {
  const { type, filePath, content, files } = event.data;

  if (type === 'parse') {
    const startTime = performance.now();

    try {
      const lines = parseInWorker(filePath, content, files);
      const parseTime = performance.now() - startTime;

      const response: ParseResponse = {
        type: 'result',
        filePath,
        lines,
        parseTime,
      };

      self.postMessage(response);
    } catch (error) {
      console.error('[Worker] Parse error:', error);
      // 에러 시 빈 배열 반환
      self.postMessage({
        type: 'result',
        filePath,
        lines: [],
        parseTime: 0,
      });
    }
  }
});

console.log('[Worker] Code parser worker initialized');
