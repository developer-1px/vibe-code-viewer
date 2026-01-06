import { Package } from 'lucide-react';
import { FileIcon } from '@/entities/SourceFileNode/ui/FileIcon';
import { useOpenFile } from '@/features/File/OpenFiles/lib/useOpenFile';
import type { DependencyItem } from '@/shared/dependencyAnalyzer';

interface RelatedPanelItemProps {
  item: DependencyItem;
  depth: number;
}

export function RelatedPanelItem({ item, depth: _depth }: RelatedPanelItemProps) {
  const { openFile } = useOpenFile();

  const handleClick = () => {
    if (!item.isNpm) {
      openFile(item.filePath);
    }
  };

  // 파일명 추출 (경로에서 파일명만, 확장자 포함)
  const fileName = item.isNpm
    ? item.filePath // NPM 모듈은 패키지명 전체
    : item.filePath.split('/').pop() || item.filePath;

  return (
    <div
      className={`flex items-center gap-2 pl-7 pr-2 py-1 text-2xs ${
        item.isNpm
          ? 'text-text-tertiary cursor-default'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-deep/50 cursor-pointer'
      } transition-colors`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!item.isNpm && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      role={item.isNpm ? undefined : 'button'}
      tabIndex={item.isNpm ? undefined : 0}
      title={item.isNpm ? `NPM: ${item.filePath}` : item.filePath}
    >
      {/* Icon */}
      {item.isNpm ? (
        <div className="shrink-0 flex items-center justify-center" style={{ width: '11px', height: '11px' }}>
          <Package size={11} className="text-warm-300" />
        </div>
      ) : (
        <FileIcon fileName={fileName} size={11} className="text-text-tertiary" />
      )}

      {/* File name */}
      <span className="flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis">{fileName}</span>

      {/* Depth badge (optional, for debugging) */}
      {/* <span className="text-3xs text-text-faint">d{depth}</span> */}
    </div>
  );
}
