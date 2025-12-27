import { VariableNode } from '../../../entities/VariableNode';

/**
 * Ensure a default export node exists for a file
 * Links the default export to the template/JSX root if provided
 */
export function ensureDefaultExport(
  filePath: string,
  templateId: string | null,
  nodes: Map<string, VariableNode>
): void {
  const defaultId = `${filePath}::default`;

  // If explicit export default wasn't found (e.g. script setup), create a synthetic node
  if (!nodes.has(defaultId)) {
    nodes.set(defaultId, {
      id: defaultId,
      label: filePath.split('/').pop() || 'Component',
      filePath,
      type: 'module',
      codeSnippet: '', // Virtual node
      startLine: 0,
      dependencies: [],
    });
  }

  const defaultNode = nodes.get(defaultId)!;
  // The Component (Default Export) depends on the Template (Visual Structure)
  // This ensures when you expand "Import X", you see the Template of X.
  if (templateId && !defaultNode.dependencies.includes(templateId)) {
    defaultNode.dependencies.push(templateId);
  }
}
