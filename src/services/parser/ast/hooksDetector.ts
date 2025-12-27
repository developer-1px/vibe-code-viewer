/**
 * Check if a function node contains React hooks (functions starting with 'use')
 */
export function hasHooksInFunction(functionNode: any): boolean {
  const seen = new Set<any>();

  // Check if function body contains any calls to functions starting with 'use'
  const checkNode = (node: any): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (seen.has(node)) return false;
    seen.add(node);

    if (node.type === 'CallExpression') {
      if (node.callee.type === 'Identifier' && node.callee.name.startsWith('use')) {
        return true;
      }
    }

    // Recursively check all child nodes
    for (const key in node) {
      if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) continue;
      const value = node[key];

      if (Array.isArray(value)) {
        if (value.some((item) => checkNode(item))) return true;
      } else if (typeof value === 'object') {
        if (checkNode(value)) return true;
      }
    }

    return false;
  };

  return checkNode(functionNode.body);
}
