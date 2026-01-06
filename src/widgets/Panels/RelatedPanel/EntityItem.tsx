import { Type } from 'lucide-react';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import type { DependencyItem } from '@/shared/dependencyAnalyzer';

interface EntityItemProps {
  item: DependencyItem;
}

/**
 * EntityItem - Type/Interface 항목 표시
 *
 * ENTITIES 섹션에 사용되는 개별 항목 컴포넌트
 * - Type/Interface 아이콘 표시
 * - 클릭 시 해당 파일 열기
 * - Hover 시 파일 경로 표시
 */
export function EntityItem({ item }: EntityItemProps) {
  const { openFile } = useOpenFile();

  const handleClick = () => {
    openFile(item.filePath);
    // TODO: 향후 해당 라인으로 스크롤 기능 추가 (item.line 사용)
  };

  // Entity 이름: exportName 우선, 없으면 filePath에서 추출
  const entityName =
    item.exportName ||
    item.filePath
      .split('/')
      .pop()
      ?.replace(/\.(tsx?|jsx?)$/, '') ||
    item.filePath;

  // Kind color (type | interface)
  const kindColor = item.kind === 'interface' ? 'text-blue-400' : 'text-purple-400';

  // 파일명:LineNo 형식으로 표시
  const fileName = item.filePath.split('/').pop() || item.filePath;
  const displayLocation = item.line ? `${fileName}:${item.line}` : fileName;

  // isDirectlyUsed 기반 스타일링
  const isDirectlyUsed = item.isDirectlyUsed === true;
  const containerClass = isDirectlyUsed
    ? 'text-2xs text-text-secondary hover:text-text-primary' // 하이라이트 (밝게)
    : 'text-2xs text-text-tertiary opacity-60 hover:opacity-100'; // mute (어둡게)

  const iconColor = isDirectlyUsed ? kindColor : 'text-text-muted';

  return (
    <div
      className={`flex items-center justify-between gap-2 pl-7 pr-2 py-1 ${containerClass} hover:bg-bg-deep/50 cursor-pointer transition-colors`}
      onClick={handleClick}
      title={`${item.kind} ${entityName} (from ${item.filePath})`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Type size={11} className={`shrink-0 ${iconColor}`} />
        <span className="font-medium flex-shrink-0">{entityName}</span>
      </div>
      <span className="text-3xs text-text-faint ml-2 truncate min-w-0 font-mono">{displayLocation}</span>
    </div>
  );
}
