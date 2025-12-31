import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { Layers as IconLayers } from 'lucide-react';
import { ComponentGroup, CanvasNode } from '../../entities/CanvasNode';
import { layoutNodesAtom } from '../../store/atoms';
import { estimateNodeHeight } from './utils';

const CanvasBackground: React.FC = () => {
    const layoutNodes = useAtomValue(layoutNodesAtom);

    // Compute component groups from layout nodes
    const componentGroups = useMemo(() => {
        if (layoutNodes.length === 0) return [];

        const groups: Record<string, CanvasNode[]> = {};
        layoutNodes.forEach(node => {
            if (!groups[node.filePath]) groups[node.filePath] = [];
            groups[node.filePath].push(node);
        });

        const calculatedGroups: ComponentGroup[] = Object.entries(groups).map(([filePath, nodes]) => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            nodes.forEach(n => {
                const h = estimateNodeHeight(n);
                const w = n.type === 'template' ? 900 : 550;

                if (n.x < minX) minX = n.x;
                if (n.x + w > maxX) maxX = n.x + w;
                if (n.y < minY) minY = n.y;
                if (n.y + h > maxY) maxY = n.y + h;
            });

            return {
                filePath,
                minX: minX - 40,
                maxX: maxX + 40,
                minY: minY - 60,
                maxY: maxY + 40,
                label: filePath.split('/').pop() || 'Unknown Component'
            };
        });

        return calculatedGroups;
    }, [layoutNodes]);

    return (
        <>
            {componentGroups.map(group => (
                <div
                    key={group.filePath}
                    className="absolute border-2 border-dashed border-slate-700/50 bg-slate-800/20 rounded-xl pointer-events-none transition-all duration-500"
                    style={{
                        left: group.minX,
                        top: group.minY,
                        width: group.maxX - group.minX,
                        height: group.maxY - group.minY,
                        zIndex: 0
                    }}
                >
                    <div className="absolute -top-10 left-0 flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-t-lg border border-slate-700 border-b-0 text-slate-300">
                        <IconLayers className="w-4 h-4 text-vibe-purple" />
                        <span className="text-sm font-semibold">{group.label}</span>
                    </div>
                    {/* Visual Tree Connector (Folder Tab style) */}
                    <div className="absolute -left-[1px] top-0 bottom-0 w-1 bg-gradient-to-b from-vibe-purple/50 to-transparent opacity-50"></div>
                </div>
            ))}
        </>
    );
};

export default CanvasBackground;