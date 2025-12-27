import type { TemplateTokenRange } from '../../CanvasNode';

export interface LocalReference {
  name: string;           // Variable/function name
  nodeId: string;         // Statement node ID
  summary: string;        // 1-line code summary
  type: VariableNode['type'];
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
  localReferences?: LocalReference[]; // For JSX_ROOT (View): local vars/functions used in return statement
}

export interface GraphData {
  nodes: VariableNode[];
}

export interface GraphNode extends VariableNode {
  x?: number;
  y?: number;
  depth?: number;
}
