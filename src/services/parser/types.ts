import { VariableNode } from '../../entities/VariableNode';

// Parser context that gets passed through functions
export interface ParserContext {
  nodes: Map<string, VariableNode>;
  dependencies: Map<string, Set<string>>;
  fileExports: Map<string, Map<string, string>>;
}

// Vue file parsing result
export interface VueFileParts {
  scriptContent: string | null;
  templateContent: string | null;
  scriptAst: any;
  templateAst: any;
  scriptStartLine: number;
  templateStartLine: number;
  scriptContentOffset: number;
  templateContentOffset: number;
}

// Local reference from return statement
export interface LocalReferenceData {
  name: string;
  nodeId: string;
  summary: string;
  type: VariableNode['type'];
}

// Token range data
export interface TokenRange {
  start: number;
  end: number;
  nodeId: string;
}
