/**
 * Extract token ranges from AST for syntax highlighting
 */

interface TokenRange {
  startOffset: number;
  endOffset: number;
  text: string;
  tokenIds: string[];
}

/**
 * Extract token ranges from code AST
 * Finds all identifiers that reference local definitions
 */
export function extractTokenRangesFromCode(
  code: string,
  localDefs: Set<string>,
  ast: any
): TokenRange[] {
  const tokenRanges: TokenRange[] = [];
  const addedPositions = new Set<string>(); // Track added positions to avoid duplicates
  const seen = new Set<any>(); // Cycle protection

  // Traverse the entire AST and find all identifier references
  const traverse = (node: any, parent: any = null) => {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (node.type === 'Identifier') {
      const name = node.name;

      // Skip keywords
      if (['true', 'false', 'null', 'undefined', 'this'].includes(name)) return;

      // Skip object keys in non-computed properties
      if (
        parent?.type === 'ObjectProperty' &&
        parent.key === node &&
        !parent.computed &&
        !parent.shorthand
      )
        return;

      // Skip property access in non-computed member expressions
      if (
        (parent?.type === 'MemberExpression' ||
          parent?.type === 'OptionalMemberExpression') &&
        parent.property === node &&
        !parent.computed
      )
        return;

      // Check if this is a local definition
      if (localDefs.has(name)) {
        const posKey = `${node.start}-${node.end}`;
        if (!addedPositions.has(posKey)) {
          addedPositions.add(posKey);
          tokenRanges.push({
            startOffset: node.start,
            endOffset: node.end,
            text: name,
            tokenIds: [name], // Will be converted to full ID later
          });
        }
      }
    }

    // Recursively traverse
    for (const key in node) {
      if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) continue;
      const value = node[key];

      if (Array.isArray(value)) {
        value.forEach((v) => traverse(v, node));
      } else if (typeof value === 'object') {
        traverse(value, node);
      }
    }
  };

  traverse(ast);

  return tokenRanges;
}
