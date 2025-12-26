// --- AST Utilities ---

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

export const traverseTemplateAST = (node: any, knownVars: Set<string>, foundDeps: Set<string>) => {
      if (!node) return;

      const checkContent = (text: string) => {
          if (!text || typeof text !== 'string') return;

          // Remove string literals to avoid false positives
          // e.g., "for-marketplace" should not extract "for", "marketplace"
          let cleaned = text
              .replace(/'[^']*'/g, '""')  // Remove single-quoted strings
              .replace(/"[^"]*"/g, '""')  // Remove double-quoted strings
              .replace(/`[^`]*`/g, '""'); // Remove template literals

          // Extract identifiers
          const ids = cleaned.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g);
          if (ids) {
              ids.forEach(id => {
                  // Skip common keywords that are not dependencies
                  if (['true', 'false', 'null', 'undefined', 'this', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'function', 'const', 'let', 'var', 'new', 'typeof', 'instanceof'].includes(id)) {
                      return;
                  }
                  if (knownVars.has(id)) {
                      foundDeps.add(id);
                  }
              });
          }
      };

      // Type 5 = Interpolation {{ }}
      if (node.type === 5 && node.content?.content) checkContent(node.content.content);

      // Type 1 = Element (Tag)
      if (node.type === 1) {
          const tagName = node.tag;
          // Check for pascal case match (e.g. MarketplaceSelectorType)
          if (knownVars.has(tagName)) {
              foundDeps.add(tagName);
          }
          // Check for kebab case match (e.g. marketplace-selector-type -> MarketplaceSelectorType)
          const pascal = tagName.replace(/-(\w)/g, (_: any, c: string) => c ? c.toUpperCase() : '').replace(/^[a-z]/, (c: string) => c.toUpperCase());
          if (knownVars.has(pascal)) {
               foundDeps.add(pascal);
          }
      }

      if (node.props) {
          node.props.forEach((prop: any) => {
              // Type 6 = Attribute (static, like class="foo")
              // Type 7 = Directive (v-if, v-bind, v-on, etc.)

              if (prop.type === 7) {
                  // IMPORTANT: Only check prop.exp (the value expression)
                  // DO NOT check prop.arg (the attribute name like "total" in :total)

                  // prop.exp.content contains the actual variable reference
                  // e.g., in :total="total", prop.exp.content = "total" (the variable)
                  // prop.arg would be "total" (the prop name) - which we should NOT treat as dependency

                  if (prop.exp?.content) {
                      // Debug: Log what we're checking
                      console.log('🔍 Template check:', {
                          propName: prop.arg?.content || prop.name,
                          expContent: prop.exp.content,
                          expType: prop.exp.type
                      });
                      checkContent(prop.exp.content);
                  }
              }

              // Type 6 attributes are static strings, no need to check
          });
      }

      if (node.children) {
          node.children.forEach((c: any) => traverseTemplateAST(c, knownVars, foundDeps));
      }
};
