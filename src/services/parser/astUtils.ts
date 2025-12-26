// --- AST Utilities ---

import { parse as parseBabel } from '@babel/parser';

export const extractIdentifiersFromPattern = (pattern: any): string[] => {
    const ids: string[] = [];
    if (pattern.type === 'Identifier') ids.push(pattern.name);
    else if (pattern.type === 'ObjectPattern') {
        pattern.properties.forEach((prop: any) => {
            if (prop.type === 'ObjectProperty' && prop.value.type === 'Identifier') {
                ids.push(prop.value.name);
            }
        });
    } else if (pattern.type === 'ArrayPattern') {
        pattern.elements.forEach((el: any) => {
            if (el && el.type === 'Identifier') ids.push(el.name);
        });
    }
    return ids;
};

export const findDependenciesInAST = (rootNode: any, knownIds: Set<string>, selfId: string): string[] => {
    const deps = new Set<string>();
    if (!rootNode) return [];

    const visit = (node: any, localScope: Set<string> = new Set()) => {
        if (!node || typeof node !== 'object') return;

        // Handle function declarations/expressions - collect params as local variables
        if (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') {

            const functionLocalScope = new Set(localScope);

            // Extract parameter names
            if (node.params) {
                node.params.forEach((param: any) => {
                    const paramNames = extractIdentifiersFromPattern(param);
                    paramNames.forEach(name => functionLocalScope.add(name));
                });
            }

            // Visit function body with extended scope
            if (node.body) {
                visit(node.body, functionLocalScope);
            }
            return;
        }

        // Handle variable declarations - add to local scope
        if (node.type === 'VariableDeclaration') {
            const extendedScope = new Set(localScope);
            node.declarations.forEach((decl: any) => {
                const varNames = extractIdentifiersFromPattern(decl.id);
                varNames.forEach(name => extendedScope.add(name));
            });

            // Visit declarations with extended scope
            node.declarations.forEach((decl: any) => {
                if (decl.init) visit(decl.init, extendedScope);
            });
            return;
        }

        if (node.type === 'Identifier') {
            const name = node.name;
            const fullId = `${selfId.split('::')[0]}::${name}`;

            // Only add as dependency if:
            // 1. It's in the known IDs (defined in file)
            // 2. It's not the self node
            // 3. It's NOT in the local scope (not a parameter or local variable)
            if (knownIds.has(name) && fullId !== selfId && !localScope.has(name)) {
                deps.add(name);
            }
            return;
        }

        // Skip keys in objects/members to avoid false positives
        if (node.type === 'ObjectProperty' && !node.computed) {
            visit(node.value, localScope);
            return;
        }
        if (node.type === 'MemberExpression' && !node.computed) {
            visit(node.object, localScope);
            return;
        }

        // Recursively visit all child nodes
        Object.keys(node).forEach(key => {
            if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) return;
            const child = node[key];
            if (Array.isArray(child)) child.forEach(c => visit(c, localScope));
            else if (child && typeof child === 'object') visit(child, localScope);
        });
    };

    visit(rootNode);
    return Array.from(deps);
};
