/**
 * FileExplorer - Type Definitions
 */
import type { DeadCodeItem } from '../../../features/Code/CodeAnalyzer/DeadCodeAnalyzer/lib/deadCodeAnalyzer.ts';

export interface FolderNode {
  id: string; // 고유 ID (불변)
  parentId: string | null; // 부모 노드 ID
  name: string;
  path: string;
  type: 'folder' | 'file' | 'dead-code-item';
  children?: FolderNode[];
  filePath?: string; // file 또는 dead-code-item일 경우 전체 경로
  deadCodeItem?: DeadCodeItem; // dead-code-item일 경우 DeadCodeItem 정보
}

export interface FlatItem {
  id: string; // 고유 ID
  parentId: string | null; // 부모 ID
  type: 'folder' | 'file' | 'dead-code-item';
  path: string;
  filePath?: string;
}
