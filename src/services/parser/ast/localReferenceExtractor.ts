import { VariableNode } from '../../../entities/VariableNode';
import { LocalReferenceData } from '../types';

/**
 * Extract local variable/function references from a return statement AST node
 */
export function extractLocalReferences(
  returnNode: any,
  fileVarNames: Set<string>,
  filePath: string,
  nodes: Map<string, VariableNode>
): LocalReferenceData[] {
  const localReferences: LocalReferenceData[] = [];
  const foundNames = new Set<string>();
  const seen = new Set<any>();

  // Traverse return expression to find all local variable/function references
  const traverse = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    // Find Identifier nodes that reference local variables
    if (node.type === 'Identifier') {
      const name = node.name;

      // Skip if already found, is a keyword, or is not a local variable
      if (foundNames.has(name)) return;
      if (['true', 'false', 'null', 'undefined', 'this'].includes(name)) return;
      if (!fileVarNames.has(name)) return;

      foundNames.add(name);

      // Find the corresponding node
      const nodeId = `${filePath}::${name}`;
      const varNode = nodes.get(nodeId);

      if (varNode) {
        // Create 1-line summary (first line of code snippet)
        const summary = varNode.codeSnippet.split('\n')[0].trim();

        localReferences.push({
          name,
          nodeId: varNode.id,
          summary,
          type: varNode.type,
        });
      }
    }

    // Recursively traverse children
    for (const key in node) {
      if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) continue;
      const value = node[key];

      if (Array.isArray(value)) {
        value.forEach((item) => traverse(item));
      } else if (typeof value === 'object') {
        traverse(value);
      }
    }
  };

  traverse(returnNode);

  return localReferences;
}
