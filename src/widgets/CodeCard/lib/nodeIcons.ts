/**
 * Node Icon Mapping
 * Switch statement → 객체 매핑으로 변환하여 가독성과 유지보수성 향상
 */

import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle as IconAlertCircle,
  Box as IconBox,
  BoxSelect as IconBoxSelect,
  Calculator as IconCalculator,
  Database as IconDatabase,
  FunctionSquare as IconFunctionSquare,
  LayoutTemplate as IconLayoutTemplate,
  Link2 as IconLink2,
  PlayCircle as IconPlayCircle,
  RefreshCw as IconRefreshCw,
  Shield as IconShield,
  Terminal as IconTerminal,
  Zap as IconZap,
} from 'lucide-react';

export interface NodeIconConfig {
  Icon: LucideIcon;
  color: string;
  category: 'calculation' | 'state' | 'effect' | 'legacy' | 'default';
}

/**
 * Node Type별 Icon 및 Color 매핑
 *
 * 카테고리:
 * - calculation: 불변, 청록/파랑 계열
 * - state: 상태 변경, 주황/노랑 계열
 * - effect: 부수효과, 빨강/분홍 계열
 * - legacy: 레거시 타입
 */
export const NODE_ICON_MAP: Record<string, NodeIconConfig> = {
  // === CALCULATIONS (불변, 청록/파랑 계열) ===
  'pure-function': {
    Icon: IconCalculator,
    color: 'text-cyan-400',
    category: 'calculation',
  },
  'immutable-data': {
    Icon: IconShield,
    color: 'text-blue-400',
    category: 'calculation',
  },
  computed: {
    Icon: IconFunctionSquare,
    color: 'text-sky-400',
    category: 'calculation',
  },

  // === STATE ACTIONS (상태 변경, 주황/노랑 계열) ===
  ref: {
    Icon: IconDatabase,
    color: 'text-emerald-400',
    category: 'state', // 하위 호환
  },
  'state-ref': {
    Icon: IconDatabase,
    color: 'text-amber-400',
    category: 'state',
  },
  'state-action': {
    Icon: IconRefreshCw,
    color: 'text-orange-400',
    category: 'state',
  },
  'mutable-ref': {
    Icon: IconAlertCircle,
    color: 'text-yellow-400',
    category: 'state',
  },

  // === EFFECT ACTIONS (부수효과, 빨강/분홍 계열) ===
  'effect-action': {
    Icon: IconZap,
    color: 'text-red-400',
    category: 'effect',
  },
  hook: {
    Icon: IconLink2,
    color: 'text-violet-400',
    category: 'effect',
  },

  // === LEGACY/OTHER ===
  function: {
    Icon: IconTerminal,
    color: 'text-amber-400',
    category: 'legacy',
  },
  template: {
    Icon: IconLayoutTemplate,
    color: 'text-pink-400',
    category: 'legacy',
  },
  call: {
    Icon: IconPlayCircle,
    color: 'text-yellow-400',
    category: 'legacy',
  },
  module: {
    Icon: IconBoxSelect,
    color: 'text-orange-400',
    category: 'legacy',
  },
} as const;

/**
 * Default fallback icon
 */
const DEFAULT_ICON: NodeIconConfig = {
  Icon: IconBox,
  color: 'text-slate-400',
  category: 'default',
};

/**
 * Node Type에 해당하는 Icon 정보 반환
 *
 * @param nodeType - Node의 type 필드
 * @returns Icon 컴포넌트 및 color 클래스명
 *
 * @example
 * const iconConfig = getNodeIcon('pure-function');
 * <iconConfig.Icon className={iconConfig.color} />
 */
export function getNodeIcon(nodeType: string): NodeIconConfig {
  return NODE_ICON_MAP[nodeType] ?? DEFAULT_ICON;
}
