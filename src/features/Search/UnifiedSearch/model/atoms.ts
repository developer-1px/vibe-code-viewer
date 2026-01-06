/**
 * UnifiedSearch Feature - Atoms
 * 통합 검색 기능 관련 상태 atoms (Shift+Shift 검색 모달)
 */
import { atom } from 'jotai';
import type { CodeSymbolMetadata } from '../../../../entities/CodeSymbol/model/types.ts';
import type { SearchResult } from './types.ts';

// 검색 모달 열림/닫힘 상태
export const searchModalOpenAtom = atom(false);

// 검색 쿼리 문자열
export const searchQueryAtom = atom('');

// 검색 결과 목록
export const searchResultsAtom = atom([] as SearchResult[]);

// 키보드 네비게이션 포커스 인덱스
export const searchFocusedIndexAtom = atom(0);

// 심볼 메타데이터 캐시
export const symbolMetadataAtom = atom(new Map<string, CodeSymbolMetadata>());

// 검색 결과 트리 접힌 폴더들
// NOTE: DeadCodeAnalyzer의 collapsedFoldersAtom과는 별개의 atom임!
export const collapsedFoldersAtom = atom(new Set<string>());
