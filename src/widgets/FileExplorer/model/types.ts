/**
 * FileExplorer - Type Definitions
 */

export interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: FolderNode[];
  filePath?: string; // file일 경우 전체 경로
}

export interface FlatItem {
  type: 'folder' | 'file';
  path: string;
  filePath?: string;
}
