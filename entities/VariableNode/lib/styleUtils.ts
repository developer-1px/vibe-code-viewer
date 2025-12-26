
import { VariableNode } from '../model/types';

export const getNodeBorderColor = (type: VariableNode['type']): string => {
    switch (type) {
        case 'template': return 'border-pink-500/50 shadow-pink-900/20';
        case 'computed': return 'border-vibe-accent/50 shadow-blue-900/20';
        case 'ref': return 'border-emerald-500/50 shadow-emerald-900/20';
        case 'call': return 'border-yellow-500/50 shadow-yellow-900/20';
        case 'module': return 'border-orange-500/50 shadow-orange-900/20';
        default: return 'border-vibe-border shadow-black/20';
    }
};

export const getTokenStyle = (isActive: boolean) => {
    return isActive
        ? 'bg-vibe-accent/20 border-vibe-accent text-vibe-accent shadow-[0_0_8px_rgba(56,189,248,0.4)]'
        : 'bg-slate-800/50 border-slate-700 text-blue-300 hover:bg-white/10 hover:border-vibe-accent/50';
};

export const getSlotColor = (type: VariableNode['type']): string => {
    switch (type) {
        case 'template':
            return 'bg-pink-500/60 border-pink-400/80 shadow-pink-500/30 group-hover/line:border-pink-300';
        case 'computed':
            return 'bg-sky-500/60 border-sky-400/80 shadow-sky-500/30 group-hover/line:border-sky-300';
        case 'ref':
            return 'bg-emerald-500/60 border-emerald-400/80 shadow-emerald-500/30 group-hover/line:border-emerald-300';
        case 'call':
            return 'bg-yellow-500/60 border-yellow-400/80 shadow-yellow-500/30 group-hover/line:border-yellow-300';
        case 'module':
            return 'bg-orange-500/60 border-orange-400/80 shadow-orange-500/30 group-hover/line:border-orange-300';
        case 'function':
            return 'bg-amber-500/60 border-amber-400/80 shadow-amber-500/30 group-hover/line:border-amber-300';
        case 'hook':
            return 'bg-violet-500/60 border-violet-400/80 shadow-violet-500/30 group-hover/line:border-violet-300';
        default:
            return 'bg-slate-500/60 border-slate-400/80 shadow-slate-500/30 group-hover/line:border-slate-300';
    }
};
