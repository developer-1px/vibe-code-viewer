/**
 * TypeScript 파서 타입 정의
 */

import * as ts from 'typescript';

/**
 * 파일 노드 - SourceFile을 기반으로 한 최소한의 구조
 */
export interface FileNode {
  id: string;           // 파일 경로 (유니크 ID)
  label: string;        // 파일명 (확장자 제외)
  filePath: string;     // 전체 파일 경로
  type: 'template';     // 노드 타입
  codeSnippet: string;  // 원본 코드
  startLine: number;    // 시작 라인 (항상 1)
  sourceFile: ts.SourceFile; // TypeScript SourceFile (모든 정보의 소스)
}
