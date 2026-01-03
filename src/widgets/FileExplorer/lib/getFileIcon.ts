/**
 * Get icon component based on file extension
 */
import { CodeXml, SquareFunction, Code2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function getFileIcon(fileName: string): LucideIcon {
  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';

  switch (ext.toLowerCase()) {
    case '.tsx':
    case '.vue':
      return CodeXml; // <code-xml> icon for TSX and Vue
    case '.ts':
    case '.js':
    case '.jsx':
      return SquareFunction; // square-function icon for TS/JS
    default:
      return Code2; // Default: </> icon for other code files
  }
}
