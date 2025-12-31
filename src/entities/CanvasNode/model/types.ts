
import type { VariableNode } from '../../SourceFileNode';

export interface TemplateTokenRange {
  startOffset: number;  // Absolute position in template content
  endOffset: number;    // Absolute position in template content
  text: string;
  tokenIds: string[];   // Dependency IDs found in this expression
  relativeStart?: number; // Line-relative column position
  relativeEnd?: number;   // Line-relative column position
  type?: 'token' | 'string' | 'comment' | 'directive-if' | 'directive-for' | 'directive-else' | 'directive-else-if'; // Added to distinguish variable tokens from string literals, comments, and directives
}

export interface CanvasNode extends VariableNode {
  x: number;
  y: number;
  level: number; // 0 for Template, -1 for immediate deps, etc.
  isVisible: boolean;
  visualId: string; // Unique ID for the UI instance (since nodes can be duplicated)
}

export interface ComponentGroup {
  filePath: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  label: string;
}
