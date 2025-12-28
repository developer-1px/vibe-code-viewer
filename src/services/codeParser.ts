/**
 * Code Parser Entry Point
 *
 * ✅ TypeScript Compiler 기반 파서 (Babel 완전 제거)
 * ✅ 외부 참조 중심 분석 (import, file-level, closure, global)
 * ✅ 함수 호출 그래프 생성
 */

import { GraphData } from '../entities/VariableNode';
import { parseProject as parseProjectTS } from './tsParser';

export const parseProject = (files: Record<string, string>, entryFile: string): GraphData => {
    return parseProjectTS(files, entryFile);
};
