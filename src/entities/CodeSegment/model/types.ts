/**
 * Code Segment entity - represents a syntax-highlighted token within a code line
 */

/**
 * Segment kind flags - multiple kinds can be combined
 */
export type SegmentKind =
  | 'text'
  | 'keyword'
  | 'punctuation'
  | 'string'
  | 'comment'
  | 'identifier'
  | 'external-import'
  | 'external-closure'
  | 'external-function'
  | 'self'
  | 'local-variable'
  | 'parameter';

/**
 * A code segment represents a single token/text piece within a code line
 * with syntax highlighting information
 */
export interface CodeSegment {
  text: string;
  kinds: SegmentKind[]; // 여러 kind를 동시에 가질 수 있음
  nodeId?: string;
  definedIn?: string;
  offset?: number; // Position in line for accurate sorting
  isDeclarationName?: boolean; // 선언되는 변수/함수/타입 이름인지 여부
  position?: number; // AST position for Language Service queries
  hoverInfo?: string; // Quick info from Language Service
  definitionLocation?: { // Definition location from Language Service
    filePath: string;
    line: number;
    character: number;
  };
}

/**
 * Segment style definition for rendering
 */
export interface SegmentStyle {
  className: string;
  title?: string;
  clickable: boolean;
  clickType?: 'close' | 'expand' | 'external' | 'definition' | 'local-variable';
  hoverTooltip?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  'data-token'?: string;
}
