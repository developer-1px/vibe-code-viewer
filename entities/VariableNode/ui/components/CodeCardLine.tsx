import React from 'react';
import { CanvasNode } from '../../model/types';
import { ProcessedLine } from '../../lib/types';
import CodeCardSlot from './CodeCardSlot';
import CodeCardToken from './CodeCardToken';

interface CodeCardLineProps {
  line: ProcessedLine;
  node: CanvasNode;
  isDefinitionLine: boolean;
  onTokenClick: (token: string, sourceNodeId: string, event: React.MouseEvent) => void;
  onSlotClick?: (tokenId: string) => void;
  nodeMap?: Map<string, CanvasNode>;
  activeDependencies: string[];
}

const CodeCardLine: React.FC<CodeCardLineProps> = ({
  line,
  node,
  isDefinitionLine,
  onTokenClick,
  onSlotClick,
  nodeMap,
  activeDependencies
}) => {
  const isTemplate = node.type === 'template';

  return (
    <div
      className={`
        flex w-full group/line relative
        ${isDefinitionLine && !isTemplate ? 'bg-vibe-accent/5' : ''}
      `}
      data-line-num={line.num}
    >
      {/* Line Number Column */}
      <div className="flex-none w-12 pr-3 flex justify-end select-none text-xs font-mono text-slate-600 border-r border-white/5 bg-[#0f172a]/50">
        <div className="relative">
          {/* Render input slots for each token in this line */}
          {line.segments.filter(seg => seg.type === 'token' && seg.tokenId).map((seg, slotIdx) => {
            const depNode = nodeMap?.get(seg.tokenId!);

            return (
              <CodeCardSlot
                key={`slot-${slotIdx}`}
                tokenId={seg.tokenId!}
                lineNum={line.num}
                slotIdx={slotIdx}
                depNode={depNode}
                onSlotClick={onSlotClick}
              />
            );
          })}

          <span className={isDefinitionLine && !isTemplate ? 'text-vibe-accent font-bold' : ''}>
            {line.num}
          </span>
        </div>
      </div>

      {/* Code Content Column */}
      <div className="flex-1 px-3 py-0.5 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
        {line.segments.map((segment, segIdx) => {
          if (segment.type === 'text') {
            return <span key={segIdx} className="text-slate-300">{segment.text}</span>;
          }

          if (segment.type === 'self') {
            return (
              <span
                key={segIdx}
                className="inline-block px-0.5 rounded bg-vibe-accent/20 border border-vibe-accent text-vibe-accent font-bold"
              >
                {segment.text}
              </span>
            );
          }

          if (segment.type === 'token' && segment.tokenId) {
            const isActive = activeDependencies.includes(segment.tokenId);

            return (
              <CodeCardToken
                key={segIdx}
                text={segment.text}
                tokenId={segment.tokenId}
                nodeId={node.id}
                isActive={isActive}
                onTokenClick={onTokenClick}
              />
            );
          }

          return null;
        })}
      </div>

      {/* Output Port (Definition Line) */}
      {isDefinitionLine && !isTemplate && (
        <div
          className="absolute right-0 top-3 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%] ring-2 ring-vibe-panel"
          data-output-port={node.id}
        />
      )}
    </div>
  );
};

export default CodeCardLine;
