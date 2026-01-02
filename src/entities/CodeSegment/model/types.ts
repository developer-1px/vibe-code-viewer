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
  | 'number'
  | 'comment'
  | 'identifier'
  | 'external-import'
  | 'external-closure'
  | 'external-function'
  | 'self'
  | 'local-variable'
  | 'parameter';

/**
 * Definition location from TypeScript Language Service
 */
export interface DefinitionLocation {
  filePath: string;
  line: number;
  character: number;
}

/**
 * A code segment represents a single token/text piece within a code line
 * with syntax highlighting information (domain model, UI-independent)
 */
export interface CodeSegment {
  text: string;
  kinds: SegmentKind[]; // Multiple kinds can be combined
  nodeId?: string;
  definedIn?: string;
  offset?: number; // Position in line for accurate sorting
  isDeclarationName?: boolean; // Whether this is a declared variable/function/type name
  position?: number; // AST position for Language Service queries
  hoverInfo?: string; // Quick info from Language Service
  definitionLocation?: DefinitionLocation; // Definition location from Language Service
  tsNode?: any; // ts.Node reference for type queries (avoid circular dependency)
}
