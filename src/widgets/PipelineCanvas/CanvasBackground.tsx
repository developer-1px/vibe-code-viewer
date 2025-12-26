import React from 'react';
import { Layers } from 'lucide-react';
import { ComponentGroup } from './useCanvasLayout.ts';

interface CanvasBackgroundProps {
    groups: ComponentGroup[];
}

const CanvasBackground: React.FC<CanvasBackgroundProps> = ({ groups }) => {
    return (
        <>
            {groups.map(group => (
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
                        <Layers className="w-4 h-4 text-vibe-purple" />
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