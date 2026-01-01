import * as ts from 'typescript';

/**
 * SourceFileNode - TypeScript SourceFile 래퍼
 *
 * 핵심 원칙:
 * - ts.SourceFile을 저장하고 필요한 정보는 getter로 추출
 * - 중복 데이터 구조를 만들지 않음
 */
export interface SourceFileNode {
  // 기본 식별자
  id: string;           // filePath
  label: string;        // 파일명 (확장자 제외)
  filePath: string;     // 파일 경로
  type: 'module';       // 모듈 타입

  // 원본 데이터
  codeSnippet: string;  // 원본 코드
  startLine: number;    // 시작 라인 (항상 1)

  // TypeScript SourceFile (모든 정보의 소스)
  sourceFile: ts.SourceFile;

  // 계산된 속성 (캐싱용 - getter로 계산한 결과를 저장)
  dependencies?: string[];  // getDependencies()로 계산

  // Vue 파일 지원
  vueTemplate?: string;  // Vue 파일의 template 섹션
  vueTemplateRefs?: Array<any>;  // Vue template에서 참조하는 변수/컴포넌트
}

export interface GraphData {
  nodes: SourceFileNode[];
}
