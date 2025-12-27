import { VariableNode } from '../../../entities/VariableNode';
import { parseTsxComponent } from '../tsxParser';
import { extractLocalReferences } from '../ast/localReferenceExtractor';

/**
 * Find JSX return statement in AST
 */
function findJSXReturn(node: any, seen = new Set<any>()): any {
  if (!node || typeof node !== 'object') return null;
  if (seen.has(node)) return null;
  seen.add(node);

  if (node.type === 'ReturnStatement') {
    const arg = node.argument;
    if (arg) {
      // Case 1: return <div...
      if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
        return arg;
      }
      // Case 2: return ( <div... )
      if (
        arg.type === 'ParenthesizedExpression' &&
        (arg.expression.type === 'JSXElement' || arg.expression.type === 'JSXFragment')
      ) {
        return arg.expression; // Return inner expression to get tighter line bounds
      }
    }
  }

  for (const key in node) {
    if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const result: any = findJSXReturn(item, seen);
        if (result) return result;
      }
    } else if (typeof value === 'object') {
      const result: any = findJSXReturn(value, seen);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Process React/TSX file and create JSX_ROOT node
 */
export function processReactJSX(
  filePath: string,
  ast: any,
  scriptContent: string,
  nodes: Map<string, VariableNode>
): string | null {
  // Get all variables defined in this file
  const fileVars = Array.from(nodes.values()).filter((n) => n.filePath === filePath);
  const fileVarNames = new Set(fileVars.map((n) => n.id.split('::').pop()!));

  // Parse entire TSX file to find dependencies (we still need this for linking)
  const parseResult = parseTsxComponent(ast, fileVarNames);

  // --- EXTRACT JSX SNIPPET ---
  // Instead of showing the whole file, we try to find the main return statement with JSX
  let jsxSnippet = scriptContent;
  let jsxStartLine = 1;
  let snippetStartOffset = 0; // The absolute offset where the snippet starts in the original file

  const jsxNodeFound = findJSXReturn(ast);

  if (jsxNodeFound && jsxNodeFound.loc) {
    const startLine = jsxNodeFound.loc.start.line;
    const endLine = jsxNodeFound.loc.end.line;

    // Calculate offset of the start of the line (preserve indentation)
    let currentOffset = 0;
    for (let i = 1; i < startLine; i++) {
      const nextNewline = scriptContent.indexOf('\n', currentOffset);
      if (nextNewline === -1) break;
      currentOffset = nextNewline + 1;
    }
    snippetStartOffset = currentOffset;

    // Calculate offset of the end of the end line
    let endOffset = currentOffset;
    for (let i = startLine; i <= endLine; i++) {
      const nextNewline = scriptContent.indexOf('\n', endOffset);
      if (nextNewline === -1) {
        endOffset = scriptContent.length;
        break;
      }
      if (i === endLine) {
        endOffset = nextNewline; // Stop before newline of last line
      } else {
        endOffset = nextNewline + 1;
      }
    }

    jsxSnippet = scriptContent.substring(snippetStartOffset, endOffset);
    jsxStartLine = startLine;
  }

  const jsxId = `${filePath}::JSX_ROOT`;
  const snippetEndOffset = snippetStartOffset + jsxSnippet.length;

  // Extract local references from JSX return statement
  const localReferences = jsxNodeFound
    ? extractLocalReferences(jsxNodeFound, fileVarNames, filePath, nodes)
    : [];

  // Check if we have statement nodes for this file (from React component processing)
  const statementNodes = Array.from(nodes.values()).filter(
    (n) => n.filePath === filePath && n.id.includes('_stmt_')
  );

  // FIX: Dependencies must include BOTH internal logic (statements) AND external references (JSX deps)
  const statementIds = statementNodes.map((n) => n.id);
  const jsxRefIds = parseResult.dependencies.map((name) => `${filePath}::${name}`);

  // Merge and deduplicate
  const dependencies = Array.from(new Set([...statementIds, ...jsxRefIds]));

  const fileName = filePath.split('/').pop() || 'Component';
  const jsxNode: VariableNode = {
    id: jsxId,
    label: `${fileName} (View)`,
    filePath,
    type: 'template',
    codeSnippet: jsxSnippet,
    startLine: jsxStartLine,
    dependencies,
    // Adjust token ranges to be relative to the extracted snippet
    templateTokenRanges: parseResult.tokenRanges
      .filter(
        (range) => range.startOffset >= snippetStartOffset && range.endOffset <= snippetEndOffset
      )
      .map((range) => ({
        ...range,
        startOffset: range.startOffset - snippetStartOffset,
        endOffset: range.endOffset - snippetStartOffset,
        tokenIds: range.tokenIds.map((name: string) => `${filePath}::${name}`),
      })),
    // Add local references for JSX_ROOT nodes
    localReferences: localReferences.length > 0 ? localReferences : undefined,
  };

  nodes.set(jsxId, jsxNode);

  // FIX: Link Component nodes (PascalCase functions) to JSX_ROOT
  // This ensures that "UserList" component node depends on its View (JSX_ROOT).
  const potentialComponents = Array.from(nodes.values()).filter(
    (n) =>
      n.filePath === filePath &&
      n.id !== jsxId &&
      n.type !== 'module' &&
      n.type !== 'template' &&
      !n.id.includes('_stmt_')
  );

  potentialComponents.forEach((node) => {
    const name = node.label;
    // Check if PascalCase (heuristic for components)
    if (name && name.length > 0 && name[0] === name[0].toUpperCase()) {
      if (!node.dependencies.includes(jsxId)) {
        node.dependencies.push(jsxId);
      }
    }
  });

  return jsxId;
}
