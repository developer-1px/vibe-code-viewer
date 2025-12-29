/**
 * Segment components - 핸들러 기반 컴포넌트 분리
 */

export { StaticSegment } from './StaticSegment';
export { ExpandSegment } from './ExpandSegment';
export { ExternalSegment } from './ExternalSegment';
export { DependencyTokenSegment } from './DependencyTokenSegment';

// Focus Mode feature에서 re-export
export { LocalVariableSegment } from '../../../../features/FocusMode/ui/LocalVariableSegment';
