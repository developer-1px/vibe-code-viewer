/**
 * Category utility functions
 */
import { AlertTriangle, Package, FunctionSquare, Box } from 'lucide-react';

export function renderCategoryIcon(category: string) {
  switch (category) {
    case 'unusedImports':
      return <Package size={14} className="text-emerald-300" />; // 가장 안전 - 초록
    case 'unusedVariables':
      return <Box size={14} className="text-cyan-300" />; // 안전 - 청록
    case 'deadFunctions':
      return <FunctionSquare size={14} className="text-amber-300" />; // 주의 - 노랑
    case 'unusedExports':
      return <Package size={14} className="text-orange-400" />; // 위험 - 주황/빨강
    default:
      return <AlertTriangle size={14} className="text-text-muted" />;
  }
}

export function getItemKey(item: { filePath: string; line: number; symbolName: string }): string {
  return `${item.filePath}:${item.line}:${item.symbolName}`;
}
