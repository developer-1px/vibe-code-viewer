/**
 * Focus Mode Feature
 *
 * Local variable highlighting 기능
 * - 클릭한 변수만 강조하고 나머지는 grayscale 처리
 * - 여러 변수를 동시에 focus 가능
 * - Declaration과 모든 usage가 함께 highlight
 */

export { activeLocalVariablesAtom } from './model/atoms';
export { LocalVariableSegment } from './ui/LocalVariableSegment';
