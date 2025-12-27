/**
 * AST utility functions for extracting return statements from functions
 */

/**
 * Find return statement within a single function node
 */
export function findReturnInSingleFunction(
  functionNode: any,
  innerSeen = new Set<any>()
): any {
  if (!functionNode || typeof functionNode !== 'object') return null;
  if (innerSeen.has(functionNode)) return null;
  innerSeen.add(functionNode);

  const body = functionNode.body;
  if (!body) return null;

  // If arrow function with direct return (no block): () => value
  if (functionNode.type === 'ArrowFunctionExpression' && body.type !== 'BlockStatement') {
    return body; // The expression itself is the return value
  }

  // For BlockStatement, find ReturnStatement
  if (body.type === 'BlockStatement' && body.body) {
    // Look for the last return statement (most likely to be the main return)
    for (let i = body.body.length - 1; i >= 0; i--) {
      const stmt = body.body[i];
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        return stmt.argument;
      }
    }
  }

  return null;
}

/**
 * Find the return statement of the main exported function in a file
 * Prioritizes exports that match the filename
 */
export function findMainFunctionReturn(
  ast: any,
  filePath: string = '',
  seen = new Set<any>()
): any {
  // Get filename without extension (e.g., "useCanvasLayout" from "useCanvasLayout.ts")
  const fileName = filePath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';

  // Collect all exported functions
  const exportedFunctions: Array<{ name: string; returnNode: any }> = [];

  // Traverse AST to find all exported functions
  const traverse = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    // Export default function/arrow
    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration;
      if (decl.type === 'FunctionDeclaration' || decl.type === 'ArrowFunctionExpression') {
        const ret = findReturnInSingleFunction(decl);
        if (ret) {
          exportedFunctions.push({ name: 'default', returnNode: ret });
        }
      }
    }

    // Named export: export const useCanvasLayout = () => { ... return {...} }
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      const decl = node.declaration;
      if (decl.type === 'VariableDeclaration') {
        for (const varDecl of decl.declarations) {
          if (
            varDecl.id.type === 'Identifier' &&
            varDecl.init &&
            (varDecl.init.type === 'ArrowFunctionExpression' ||
              varDecl.init.type === 'FunctionExpression')
          ) {
            const ret = findReturnInSingleFunction(varDecl.init);
            if (ret) {
              exportedFunctions.push({ name: varDecl.id.name, returnNode: ret });
            }
          }
        }
      } else if (decl.type === 'FunctionDeclaration' && decl.id) {
        const ret = findReturnInSingleFunction(decl);
        if (ret) {
          exportedFunctions.push({ name: decl.id.name, returnNode: ret });
        }
      }
    }

    // Recursively search in program body
    if (node.type === 'Program' && node.body) {
      for (const stmt of node.body) {
        traverse(stmt);
      }
    }
  };

  traverse(ast);

  // Prioritize export that matches the filename
  const matchingExport = exportedFunctions.find((exp) => exp.name === fileName);
  if (matchingExport) {
    return matchingExport.returnNode;
  }

  // Fallback to first exported function
  if (exportedFunctions.length > 0) {
    return exportedFunctions[0].returnNode;
  }

  return null;
}
