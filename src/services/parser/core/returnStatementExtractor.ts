import { VariableNode } from '../../../entities/VariableNode';
import { findReturnInSingleFunction } from '../ast/returnExtractor';
import { extractLocalReferences } from '../ast/localReferenceExtractor';

/**
 * Extract return statements for all function nodes in a file
 * Replaces function body with just the return statement for better visualization
 */
export function extractReturnStatements(
  filePath: string,
  scriptContent: string,
  localDefs: Set<string>,
  startLineOffset: number,
  nodes: Map<string, VariableNode>
): void {
  nodes.forEach((node) => {
    if (node.filePath === filePath && !node.id.includes('_stmt_')) {
      // @ts-ignore
      const astNode = node.astNode;

      if (
        astNode &&
        (astNode.type === 'ArrowFunctionExpression' ||
          astNode.type === 'FunctionExpression' ||
          astNode.type === 'FunctionDeclaration')
      ) {
        const returnNode = findReturnInSingleFunction(astNode);
        if (returnNode) {
          const fullCode = scriptContent;

          // Extract return statement snippet
          let returnSnippet = node.codeSnippet;
          let returnStartLine = node.startLine;

          if (returnNode.loc) {
            const startLine = returnNode.loc.start.line;
            const endLine = returnNode.loc.end.line;

            let currentOffset = 0;
            for (let i = 1; i < startLine; i++) {
              const nextNewline = fullCode.indexOf('\n', currentOffset);
              if (nextNewline === -1) break;
              currentOffset = nextNewline + 1;
            }
            const snippetStartOffset = currentOffset;

            let endOffset = currentOffset;
            for (let i = startLine; i <= endLine; i++) {
              const nextNewline = fullCode.indexOf('\n', endOffset);
              if (nextNewline === -1) {
                endOffset = fullCode.length;
                break;
              }
              if (i === endLine) {
                endOffset = nextNewline;
              } else {
                endOffset = nextNewline + 1;
              }
            }

            returnSnippet = fullCode.substring(snippetStartOffset, endOffset);
            returnStartLine = startLine + startLineOffset;

            // Extract local references
            const localReferences = extractLocalReferences(
              returnNode,
              localDefs,
              filePath,
              nodes
            );

            // Update node
            node.codeSnippet = returnSnippet;
            node.startLine = returnStartLine;
            if (localReferences.length > 0) {
              node.localReferences = localReferences;
            }
          }
        }
      }
    }
  });
}
