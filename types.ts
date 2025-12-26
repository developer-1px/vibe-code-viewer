export interface VariableNode {
  id: string;
  label: string;
  type: 'ref' | 'computed' | 'prop' | 'store' | 'function' | 'hook' | 'template';
  codeSnippet: string;
  startLine: number;
  dependencies: string[];
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

export interface CanvasLink {
  source: string;
  target: string;
}

export interface GraphNode extends VariableNode {
  x?: number;
  y?: number;
  depth?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}