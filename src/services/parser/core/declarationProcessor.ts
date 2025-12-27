import { VariableNode } from '../../../entities/VariableNode';
import { extractIdentifiersFromPattern } from '../astUtils';
import { hasHooksInFunction } from '../ast/hooksDetector';
import { processReactComponentStatements } from '../processors/reactComponentProcessor';

/**
 * Infer variable type from initialization code
 */
function inferType(initCode: string): VariableNode['type'] {
  if (initCode.includes('computed')) return 'computed';
  if (initCode.includes('use') && !initCode.includes('useRoute')) return 'hook';
  if (initCode.includes('storeToRefs')) return 'store';
  return 'ref';
}

/**
 * Process a top-level declaration (variable, function, class, or export)
 * Creates nodes for declared variables/functions and tracks exports
 */
export function processDeclaration(
  node: any,
  code: string,
  lineOffset: number,
  filePath: string,
  localDefs: Set<string>,
  fileExports: Map<string, string>,
  nodes: Map<string, VariableNode>
): void {
  const getSnippet = (n: any) => code.substring(n.start, n.end);
  const getLine = (n: any) => n.loc.start.line + lineOffset;

  const createNode = (
    name: string,
    type: VariableNode['type'],
    astNode: any,
    isExported: boolean = false,
    exportName: string = name
  ) => {
    const id = `${filePath}::${name}`;
    nodes.set(id, {
      id,
      label: name,
      filePath,
      type,
      codeSnippet: getSnippet(node),
      startLine: getLine(node),
      dependencies: [],
      // @ts-ignore
      astNode,
    });
    localDefs.add(name);
    if (isExported) {
      fileExports.set(exportName, id);
    }
  };

  // Handle Exports wrapper
  const isExport =
    node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';
  const isDefaultExport = node.type === 'ExportDefaultDeclaration';
  const targetNode = isExport ? node.declaration : node;

  if (!targetNode) return;

  if (targetNode.type === 'VariableDeclaration') {
    targetNode.declarations.forEach((decl: any) => {
      const ids = extractIdentifiersFromPattern(decl.id);
      const initCode = decl.init ? getSnippet(decl.init) : '';
      const type = inferType(initCode);

      // Check if this is a React component (arrow function with hooks)
      const varName = decl.id.type === 'Identifier' ? decl.id.name : '';
      const isReactComponent = varName && varName[0] === varName[0].toUpperCase();
      const isArrowFunction =
        decl.init &&
        (decl.init.type === 'ArrowFunctionExpression' ||
          decl.init.type === 'FunctionExpression');
      const usesHooks = decl.init && isArrowFunction && hasHooksInFunction(decl.init);

      // Always create the node for the variable/component itself
      ids.forEach((name) => createNode(name, type, decl.init, isExport));

      if (isReactComponent && isArrowFunction && usesHooks) {
        // Process component statements as separate nodes
        processReactComponentStatements(
          filePath,
          varName,
          decl.init,
          code,
          lineOffset,
          localDefs,
          nodes
        );
      }
    });
  } else if (targetNode.type === 'FunctionDeclaration') {
    const name = targetNode.id ? targetNode.id.name : 'default';

    // Check if this is a React component with hooks
    const isReactComponent = name[0] === name[0].toUpperCase(); // PascalCase
    const usesHooks = hasHooksInFunction(targetNode);

    // Always create the node for the function/component itself
    createNode(name, 'function', targetNode, isExport, isDefaultExport ? 'default' : name);

    if (isReactComponent && usesHooks) {
      // Process component statements as separate nodes
      processReactComponentStatements(filePath, name, targetNode, code, lineOffset, localDefs, nodes);
    }
  } else if (targetNode.type === 'ClassDeclaration') {
    const name = targetNode.id ? targetNode.id.name : 'default';
    // Pass entire class node to preserve constructor/method info
    createNode(name, 'function', targetNode, isExport, isDefaultExport ? 'default' : name);
  }
}
