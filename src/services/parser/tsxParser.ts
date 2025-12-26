import { parse as parseBabel } from '@babel/parser';

export interface TsxTokenRange {
    startOffset: number;
    endOffset: number;
    text: string;
    tokenIds: string[]; // Local variable names (without file path prefix)
}

export interface TsxParseResult {
    dependencies: string[]; // Local variable names found in JSX
    tokenRanges: TsxTokenRange[];
    jsxStartOffset?: number; // Where JSX starts in the component
    jsxEndOffset?: number; // Where JSX ends in the component
}

/**
 * Parse a React/TSX component and extract dependencies from entire file
 * @param ast - Babel AST of the entire file
 * @param fileVarNames - Set of variable names defined in this file's scope
 * @returns Dependencies and token ranges for highlighting
 */
export const parseTsxComponent = (
    ast: any,
    fileVarNames: Set<string>
): TsxParseResult => {
    const dependencies = new Set<string>();
    const tokenRanges: TsxTokenRange[] = [];
    const addedPositions = new Set<string>(); // Track added positions to avoid duplicates
    let jsxStartOffset: number | undefined;
    let jsxEndOffset: number | undefined;

    // Traverse entire AST and extract all variable references
    const traverseAll = (node: any, localScope: Set<string> = new Set()) => {
        if (!node || typeof node !== 'object') return;

        // JSXIdentifier: Component names in JSX (e.g., <UserList />)
        if (node.type === 'JSXIdentifier') {
            const name = node.name;
            // Only process uppercase names (component convention)
            if (name[0] === name[0].toUpperCase() && fileVarNames.has(name)) {
                dependencies.add(name);
                if (node.start !== undefined && node.end !== undefined) {
                    const posKey = `${node.start}-${node.end}`;
                    if (!addedPositions.has(posKey)) {
                        addedPositions.add(posKey);
                        tokenRanges.push({
                            startOffset: node.start,
                            endOffset: node.end,
                            text: name,
                            tokenIds: [name]
                        });
                    }
                }
            }
        }

        // JSXExpressionContainer: {expression}
        if (node.type === 'JSXExpressionContainer') {
            console.log('🔍 Found JSXExpressionContainer at', node.start, '-', node.end);
            extractFromExpression(node.expression, localScope);
        }

        // JSXSpreadAttribute: {...props}
        if (node.type === 'JSXSpreadAttribute') {
            extractFromExpression(node.argument, localScope);
        }

        // Function/Arrow function - track local scope
        if (node.type === 'ArrowFunctionExpression' ||
            node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration') {
            const functionScope = new Set(localScope);
            if (node.params) {
                node.params.forEach((param: any) => {
                    if (param.type === 'Identifier') {
                        functionScope.add(param.name);
                    }
                });
            }
            if (node.body) traverseAll(node.body, functionScope);
            return; // Don't traverse children again
        }

        // Track JSX boundaries for reference
        if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
            if (jsxStartOffset === undefined || node.start < jsxStartOffset) {
                jsxStartOffset = node.start;
            }
            if (jsxEndOffset === undefined || node.end > jsxEndOffset) {
                jsxEndOffset = node.end;
            }
        }

        // Call extractFromExpression for various expression types
        if (node.type === 'CallExpression' ||
            node.type === 'VariableDeclarator' ||
            node.type === 'AssignmentExpression') {
            extractFromExpression(node, localScope);
        }

        // Recursively traverse children
        for (const key in node) {
            if (['loc', 'start', 'end', 'comments', 'extra'].includes(key)) continue;
            const value = node[key];

            if (Array.isArray(value)) {
                value.forEach(item => traverseAll(item, localScope));
            } else if (value && typeof value === 'object') {
                traverseAll(value, localScope);
            }
        }
    };

    const extractFromExpression = (expr: any, scope: Set<string>) => {
        if (!expr || typeof expr !== 'object') return;

        const visit = (n: any, parent: any = null) => {
            if (!n || typeof n !== 'object') return;

            if (n.type === 'Identifier') {
                const name = n.name;

                // Skip keywords and local scope variables
                if (['true', 'false', 'null', 'undefined', 'this'].includes(name)) return;
                if (scope.has(name)) return;

                // Skip object keys in non-computed properties
                if (parent?.type === 'ObjectProperty' && parent.key === n && !parent.computed && !parent.shorthand) return;

                // Skip property access in non-computed member expressions
                if ((parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') &&
                    parent.property === n && !parent.computed) return;

                if (fileVarNames.has(name)) {
                    dependencies.add(name);

                    // Add token range (avoid duplicates)
                    if (n.start !== undefined && n.end !== undefined) {
                        const posKey = `${n.start}-${n.end}`;
                        if (!addedPositions.has(posKey)) {
                            addedPositions.add(posKey);
                            console.log('   ✅ Adding token:', name, 'at', n.start, '-', n.end);
                            tokenRanges.push({
                                startOffset: n.start,
                                endOffset: n.end,
                                text: name,
                                tokenIds: [name]
                            });
                        }
                    }
                } else {
                    // console.log('   ❌ Skipping (not in fileVarNames):', name);
                }
            }

            // Handle arrow functions and function expressions - add params to scope
            if (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') {
                const functionScope = new Set(scope);
                if (n.params) {
                    n.params.forEach((param: any) => {
                        if (param.type === 'Identifier') {
                            functionScope.add(param.name);
                        }
                    });
                }
                if (n.body) visit(n.body, n);
                return;
            }

            // Recursively visit all properties
            for (const key in n) {
                if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) continue;
                const value = n[key];
                if (Array.isArray(value)) {
                    value.forEach(v => visit(v, n));
                } else if (typeof value === 'object') {
                    visit(value, n);
                }
            }
        };

        visit(expr);
    };

    // Traverse entire AST (includes imports, function body, JSX, etc.)
    traverseAll(ast);

    console.log('🔍 TSX Parser - Parsed entire file');
    console.log('   AST program body length:', ast.program.body.length);
    console.log('   Final dependencies:', Array.from(dependencies));
    console.log('   Token ranges:', tokenRanges.length);

    return {
        dependencies: Array.from(dependencies),
        tokenRanges,
        jsxStartOffset,
        jsxEndOffset
    };
};
