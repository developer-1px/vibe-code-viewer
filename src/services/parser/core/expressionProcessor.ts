import { VariableNode } from '../../../entities/VariableNode';

/**
 * Process top-level expression statements (e.g., function calls)
 * Creates nodes for top-level calls in setup blocks
 */
export function processExpression(
  node: any,
  code: string,
  lineOffset: number,
  filePath: string,
  nodes: Map<string, VariableNode>
): void {
  const expr = node.expression;
  const isCall = expr.type === 'CallExpression';
  const isAwaitCall = expr.type === 'AwaitExpression' && expr.argument.type === 'CallExpression';

  if (isCall || isAwaitCall) {
    const callExpr = isCall ? expr : expr.argument;
    const baseLabel =
      callExpr.callee.type === 'Identifier'
        ? `${callExpr.callee.name}()`
        : callExpr.callee.type === 'MemberExpression'
        ? `${callExpr.callee.property.name}()`
        : 'Expression';
    const label = isAwaitCall ? `await ${baseLabel}` : baseLabel;

    const id = `${filePath}::setup_call_${node.loc.start.line}`;

    nodes.set(id, {
      id,
      label,
      filePath,
      type: 'call',
      codeSnippet: code.substring(node.start, node.end),
      startLine: node.loc.start.line + lineOffset,
      dependencies: [],
      // @ts-ignore
      astNode: expr,
    });
  }
}
