export interface TemplateTokenRange {
  startOffset: number;  // Absolute position in template content
  endOffset: number;    // Absolute position in template content
  text: string;
  tokenIds: string[]; // Dependency IDs found in this expression
}

export interface VariableNode {
  id: string; // Globally unique ID (usually filePath::localName)
  label: string;
  filePath: string; // The file where this variable is defined
  type: 'ref' | 'computed' | 'prop' | 'store' | 'function' | 'hook' | 'template' | 'call' | 'module';
  codeSnippet: string;
  startLine: number;
  dependencies: string[]; // List of IDs
  templateTokenRanges?: TemplateTokenRange[]; // For template nodes: AST-based token positions
}

export interface GraphData {
  nodes: VariableNode[];
}

export interface CanvasNode extends VariableNode {
  x: number;
  y: number;
  level: number; // 0 for Template, -1 for immediate deps, etc.
  isVisible: boolean;
  visualId: string; // Unique ID for the UI instance (since nodes can be duplicated)
}

export interface GraphNode extends VariableNode {
  x?: number;
  y?: number;
  depth?: number;
}
