import { VariableNode } from '../../../entities/VariableNode';

/**
 * Process React component statements as separate nodes
 * Breaks down component logic into individual statement nodes for better visualization
 */
export function processReactComponentStatements(
  filePath: string,
  componentName: string,
  functionNode: any,
  code: string,
  lineOffset: number,
  localDefs: Set<string>,
  nodes: Map<string, VariableNode>
): void {
  const body = functionNode.body;
  if (!body || body.type !== 'BlockStatement') return;

  const statements = body.body;

  statements.forEach((stmt: any, index: number) => {
    const snippetStart = stmt.start;
    const snippetEnd = stmt.end;
    const snippet = code.substring(snippetStart, snippetEnd);
    const lineNum = stmt.loc.start.line + lineOffset;

    // Generate unique ID for this statement
    const stmtId = `${filePath}::${componentName}_stmt_${index + 1}`;

    // Determine statement type and extract variable names
    let label = '';
    let type: VariableNode['type'] = 'ref';
    const variableNames: string[] = [];

    if (stmt.type === 'VariableDeclaration') {
      const decl = stmt.declarations[0];
      if (decl && decl.id.type === 'Identifier') {
        label = decl.id.name;
        variableNames.push(decl.id.name);
      } else if (decl && decl.id.type === 'ArrayPattern') {
        const names = decl.id.elements.map((el: any) => el?.name).filter(Boolean);
        label = `[${names.join(', ')}]`;
        variableNames.push(...names);
      } else if (decl && decl.id.type === 'ObjectPattern') {
        const names = decl.id.properties.map((prop: any) => prop.key?.name).filter(Boolean);
        label = `{${names.join(', ')}}`;
        variableNames.push(...names);
      }

      // Detect hooks
      if (decl.init?.callee?.name?.startsWith('use')) {
        type = 'hook';
      }
    } else if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'CallExpression'
    ) {
      const callExpr = stmt.expression;
      if (callExpr.callee.type === 'Identifier') {
        label = `${callExpr.callee.name}()`;
        if (callExpr.callee.name.startsWith('use')) {
          type = 'hook';
        }
      }
    } else if (stmt.type === 'ReturnStatement') {
      label = 'return JSX';
      type = 'template';
    } else {
      label = `statement ${index + 1}`;
    }

    // Create statement node
    nodes.set(stmtId, {
      id: stmtId,
      label,
      filePath,
      type,
      codeSnippet: snippet,
      startLine: lineNum,
      dependencies: [],
      // @ts-ignore
      astNode: stmt,
    });

    // Create individual variable nodes that point to the statement
    variableNames.forEach((varName) => {
      const varId = `${filePath}::${varName}`;

      // Only create if not already exists (avoid overwriting imports)
      if (!nodes.has(varId)) {
        nodes.set(varId, {
          id: varId,
          label: varName,
          filePath,
          type,
          codeSnippet: snippet,
          startLine: lineNum,
          dependencies: [],
          // @ts-ignore
          astNode: stmt, // Link AST node so dependencies (e.g. useUsers) are found later
        });
        localDefs.add(varName);
      }
    });

    localDefs.add(label);
  });
}
