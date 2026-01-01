
import { SourceFileNode } from '../model/types.ts';

export const getNodeBorderColor = (type: SourceFileNode['type']): string => {
    switch (type) {
        // === CALCULATIONS (불변, 청록/파랑 계열) ===
        case 'pure-function': return 'border-cyan-500/50 shadow-cyan-900/20'; // 순수 함수
        case 'immutable-data': return 'border-blue-500/50 shadow-blue-900/20'; // 불변 상수
        case 'computed': return 'border-sky-500/50 shadow-sky-900/20'; // 계산된 값

        // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
        case 'ref': return 'border-emerald-500/50 shadow-emerald-900/20'; // 기존 ref (하위 호환)
        case 'state-ref': return 'border-amber-500/50 shadow-amber-900/20'; // 상태 참조
        case 'state-action': return 'border-orange-500/50 shadow-orange-900/20'; // 상태 액션
        case 'mutable-ref': return 'border-yellow-500/50 shadow-yellow-900/20'; // 가변 참조

        // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
        case 'effect-action': return 'border-red-500/50 shadow-red-900/20'; // 부수효과 액션
        case 'hook': return 'border-violet-500/50 shadow-violet-900/20'; // 커스텀 hook

        // === LEGACY/OTHER ===
        case 'function': return 'border-amber-500/50 shadow-amber-900/20'; // 일반 함수
        case 'template': return 'border-fuchsia-500/50 shadow-fuchsia-900/20'; // 템플릿/컴포넌트
        case 'call': return 'border-yellow-500/50 shadow-yellow-900/20'; // 함수 호출

        default: return 'border-vibe-border shadow-black/20';
    }
};

export const getTokenStyle = (isActive: boolean, isComponent: boolean = false) => {
    if (isActive) {
        return isComponent
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' // Component Active (Green)
            : 'bg-vibe-accent/20 border-vibe-accent text-vibe-accent shadow-[0_0_8px_rgba(56,189,248,0.4)]'; // Variable Active (Blue)
    }
    
    // Inactive State
    return isComponent
        ? 'bg-slate-800/50 border-slate-700 text-emerald-300 hover:bg-white/10 hover:border-emerald-500/50' // Component Inactive
        : 'bg-slate-800/50 border-slate-700 text-blue-300 hover:bg-white/10 hover:border-vibe-accent/50'; // Variable Inactive
};

export const getSlotColor = (type: SourceFileNode['type']): string => {
    switch (type) {
        // === CALCULATIONS (불변, 청록/파랑 계열) ===
        case 'pure-function':
            return 'bg-cyan-500/60 border-cyan-400/80 shadow-cyan-500/30 group-hover/line:border-cyan-300';
        case 'immutable-data':
            return 'bg-blue-500/60 border-blue-400/80 shadow-blue-500/30 group-hover/line:border-blue-300';
        case 'computed':
            return 'bg-sky-500/60 border-sky-400/80 shadow-sky-500/30 group-hover/line:border-sky-300';

        // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
        case 'ref':
            return 'bg-emerald-500/60 border-emerald-400/80 shadow-emerald-500/30 group-hover/line:border-emerald-300';
        case 'state-ref':
            return 'bg-amber-500/60 border-amber-400/80 shadow-amber-500/30 group-hover/line:border-amber-300';
        case 'state-action':
            return 'bg-orange-500/60 border-orange-400/80 shadow-orange-500/30 group-hover/line:border-orange-300';
        case 'mutable-ref':
            return 'bg-yellow-500/60 border-yellow-400/80 shadow-yellow-500/30 group-hover/line:border-yellow-300';

        // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
        case 'effect-action':
            return 'bg-red-500/60 border-red-400/80 shadow-red-500/30 group-hover/line:border-red-300';
        case 'hook':
            return 'bg-violet-500/60 border-violet-400/80 shadow-violet-500/30 group-hover/line:border-violet-300';

        // === LEGACY/OTHER ===
        case 'function':
            return 'bg-amber-500/60 border-amber-400/80 shadow-amber-500/30 group-hover/line:border-amber-300';
        case 'template':
            return 'bg-fuchsia-500/60 border-fuchsia-400/80 shadow-fuchsia-500/30 group-hover/line:border-fuchsia-300';
        case 'call':
            return 'bg-yellow-500/60 border-yellow-400/80 shadow-yellow-500/30 group-hover/line:border-yellow-300';

        default:
            return 'bg-slate-500/60 border-slate-400/80 shadow-slate-500/30 group-hover/line:border-slate-300';
    }
};

export const getEdgeColor = (type: SourceFileNode['type']): string => {
    switch (type) {
        // === CALCULATIONS (불변, 청록/파랑 계열) ===
        case 'pure-function': return '#06b6d4'; // cyan-500
        case 'immutable-data': return '#3b82f6'; // blue-500
        case 'computed': return '#0ea5e9'; // sky-500

        // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
        case 'ref': return '#10b981'; // emerald-500 (하위 호환)
        case 'state-ref': return '#f59e0b'; // amber-500
        case 'state-action': return '#f97316'; // orange-500
        case 'mutable-ref': return '#eab308'; // yellow-500

        // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
        case 'effect-action': return '#ef4444'; // red-500
        case 'hook': return '#8b5cf6'; // violet-500

        // === LEGACY/OTHER ===
        case 'function': return '#f59e0b'; // amber-500
        case 'template': return '#d946ef'; // fuchsia-500
        case 'call': return '#eab308'; // yellow-500
        case 'store': return '#14b8a6'; // teal-500

        default: return '#38bdf8'; // sky-400 (default blue)
    }
};
