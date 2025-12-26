import { GraphData, VariableNode } from '../types';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseBabel } from '@babel/parser';

// Helper to check if a node type is something we care about traversing for dependencies
const isTraversable = (node: any) => {
  return node && typeof node === 'object' && typeof node.type === 'string';
};

export class VueCodeParser {
  private rawCode: string;
  private variables: Map<string, VariableNode> = new Map();

  constructor(code: string) {
    this.rawCode = code;
  }

  public parse(): GraphData {
    // 1. Parse SFC to get Script and Template
    const { descriptor } = parseSFC(this.rawCode);
    const scriptContent = descriptor.scriptSetup?.content || descriptor.script?.content || '';
    const scriptStartLine = (descriptor.scriptSetup?.loc.start.line || descriptor.script?.loc.start.line || 1) - 1; // 0-indexed for offset

    // 2. Parse Script using Babel
    const ast = parseBabel(scriptContent, {
      sourceType: 'module',
      plugins: ['typescript']
    });

    const definedIds: Set<string> = new Set();

    // 3. Traverse Script AST to find Top-Level Declarations
    ast.program.body.forEach((node: any) => {
      this.processTopLevelNode(node, scriptContent, scriptStartLine, definedIds);
    });

    // 4. Resolve Dependencies
    this.variables.forEach(vNode => {
      const deps = this.findDependenciesInAST(vNode, definedIds, scriptContent);
      vNode.dependencies = deps;
    });

    // 5. Process Template (Using AST Traversal)
    const templateContent = descriptor.template?.content || '';
    const templateStartLine = descriptor.template?.loc.start.line || 0;
    const templateDeps = new Set<string>();

    if (descriptor.template?.ast) {
        this.traverseTemplateAST(descriptor.template.ast, definedIds, templateDeps);
    }

    const templateNode: VariableNode = {
      id: 'TEMPLATE_ROOT',
      label: '<template>',
      type: 'template',
      codeSnippet: templateContent.trim(),
      startLine: templateStartLine,
      dependencies: Array.from(templateDeps)
    };

    return {
      nodes: [...Array.from(this.variables.values()), templateNode]
    };
  }

  private traverseTemplateAST(node: any, definedIds: Set<string>, foundDeps: Set<string>) {
    // Vue Template AST Node Types
    // ROOT: 0, ELEMENT: 1, TEXT: 2, COMMENT: 3, SIMPLE_EXPRESSION: 4, INTERPOLATION: 5, ATTRIBUTE: 6, DIRECTIVE: 7, COMPOUND_EXPRESSION: 8
    
    if (!node) return;

    // 1. Handle Interpolation {{ variable }}
    if (node.type === 5) { 
        if (node.content && node.content.content) {
            this.extractIdentifiersFromExpression(node.content.content, definedIds, foundDeps);
        }
    }
    
    // 2. Handle Compound Expression (Mixed text and interpolation, e.g. "Hello {{ name }}")
    else if (node.type === 8) {
        if (node.children) {
            node.children.forEach((child: any) => {
                // Compound children can be objects (nodes) or strings (text)
                if (typeof child === 'object') {
                    this.traverseTemplateAST(child, definedIds, foundDeps);
                }
            });
        }
    }

    // 3. Handle Element (Children & Props)
    else if (node.type === 0 || node.type === 1) { // Root or Element
        // Check Props/Directives
        if (node.props && Array.isArray(node.props)) {
            node.props.forEach((prop: any) => {
                // Type 7 is DIRECTIVE (v-if, v-for, v-bind, :prop, @click)
                if (prop.type === 7) {
                    // prop.exp is the expression node. content contains the code string.
                    if (prop.exp && prop.exp.content) {
                        this.extractIdentifiersFromExpression(prop.exp.content, definedIds, foundDeps);
                    }
                }
            });
        }

        // Recurse children
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child: any) => this.traverseTemplateAST(child, definedIds, foundDeps));
        }
    }
    
    // 4. Handle V-FOR codegenNode edge cases if standard traversal missed it
    if (node.codegenNode && node.codegenNode.type === 11) { // VNODE_CALL
         // Usually props are covered above, but just in case
    }
  }

  // Parse a small snippet of JS expression (from template) and extract identifiers
  private extractIdentifiersFromExpression(expression: string, definedIds: Set<string>, foundDeps: Set<string>) {
      if (!expression || !expression.trim()) return;

      try {
          // Parse expression using Babel
          // We wrap in () to handle object literals like { a: b } which might be invalid statements but valid expressions
          const ast = parseBabel(`(${expression})`, {
              sourceType: 'module',
              plugins: ['typescript']
          });

          const visit = (node: any) => {
              if (!node || typeof node !== 'object') return;

              if (node.type === 'Identifier') {
                  // If the identifier exists in our script definitions, it's a dependency
                  if (definedIds.has(node.name)) {
                      foundDeps.add(node.name);
                  }
              }

              // Traversal Logic matching findDependenciesInAST style
              // Skip non-expression fields
              Object.keys(node).forEach(key => {
                  if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) return;
                  
                  // Context awareness:
                  // Property: key is not a dep unless computed
                  if (node.type === 'ObjectProperty' && key === 'key' && !node.computed) return;
                  if (node.type === 'MemberExpression' && key === 'property' && !node.computed) return;
                  if (node.type === 'OptionalMemberExpression' && key === 'property' && !node.computed) return;

                  const child = node[key];
                  if (Array.isArray(child)) {
                      child.forEach(c => visit(c));
                  } else if (child && typeof child === 'object') {
                      visit(child);
                  }
              });
          };

          visit(ast.program);

      } catch (e) {
          // Expression parsing might fail for complex invalid syntax, ignore to prevent crash
          // console.debug('Failed to parse template expression:', expression);
      }
  }

  private processTopLevelNode(node: any, code: string, lineOffset: number, definedIds: Set<string>) {
    // Helper to get snippet
    const getSnippet = (n: any) => {
        const start = n.start;
        const end = n.end;
        return code.substring(start, end);
    };

    // Helper to get line number
    const getLine = (n: any) => n.loc.start.line + lineOffset;

    if (node.type === 'VariableDeclaration') {
      node.declarations.forEach((decl: any) => {
        const startLine = getLine(node);
        // Pattern Matching: const { a } = ... OR const x = ...
        const ids = this.extractIdentifiersFromPattern(decl.id);
        
        // Determine type hint
        const initCode = decl.init ? getSnippet(decl.init) : '';
        let type: VariableNode['type'] = 'ref'; // default
        if (initCode.includes('computed')) type = 'computed';
        else if (initCode.includes('use') && !initCode.includes('useRoute') && !initCode.includes('useRouter')) type = 'hook';
        else if (initCode.includes('storeToRefs')) type = 'store';

        ids.forEach(id => {
            // We store the full declaration as the snippet context
            this.variables.set(id, {
                id,
                label: id,
                type,
                codeSnippet: getSnippet(node),
                startLine,
                dependencies: [],
                // @ts-ignore - internal storage for AST node to use in dep resolution
                astNode: decl.init 
            });
            definedIds.add(id);
        });
      });
    } else if (node.type === 'FunctionDeclaration') {
        const id = node.id.name;
        const startLine = getLine(node);
        this.variables.set(id, {
            id,
            label: id,
            type: 'function',
            codeSnippet: getSnippet(node),
            startLine,
            dependencies: [],
            // @ts-ignore
            astNode: node.body // We look for deps in the function body + params
        });
        definedIds.add(id);
    }
  }

  private extractIdentifiersFromPattern(pattern: any): string[] {
    const ids: string[] = [];
    if (pattern.type === 'Identifier') {
        ids.push(pattern.name);
    } else if (pattern.type === 'ObjectPattern') {
        pattern.properties.forEach((prop: any) => {
            if (prop.type === 'ObjectProperty') {
                // { a: b } -> b is the local var
                if (prop.value.type === 'Identifier') {
                    ids.push(prop.value.name);
                }
            }
        });
    } else if (pattern.type === 'ArrayPattern') {
        pattern.elements.forEach((el: any) => {
            if (el && el.type === 'Identifier') ids.push(el.name);
        });
    }
    return ids;
  }

  // Recursive walk to find identifiers in the RHS/Body
  private findDependenciesInAST(variable: VariableNode, allIds: Set<string>, fullCode: string): string[] {
    const deps = new Set<string>();
    const rootNode = (variable as any).astNode;
    
    if (!rootNode) return [];

    const visit = (node: any) => {
        if (!node || typeof node !== 'object') return;

        // --- Context-Aware Traversal to skip non-reference Identifiers (e.g. keys) ---

        // 1. Object Property: { key: value }
        if (node.type === 'ObjectProperty') {
            // Only visit key if computed: { [key]: value }
            if (node.computed) {
                visit(node.key);
            }
            // Always visit value
            visit(node.value);
            return;
        }

        // 2. Object Method: { method() {} }
        if (node.type === 'ObjectMethod') {
            if (node.computed) {
                visit(node.key);
            }
            node.params.forEach((p: any) => visit(p));
            visit(node.body);
            return;
        }

        // 3. Member Expression: obj.prop or obj[prop]
        if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
            visit(node.object);
            if (node.computed) {
                visit(node.property);
            }
            return;
        }

        if (node.type === 'Identifier') {
            const name = node.name;
            if (allIds.has(name) && name !== variable.id) {
                deps.add(name);
            }
            return;
        }

        // Standard recursive traversal
        // We iterate keys but exclude specific non-logic fields
        Object.keys(node).forEach(key => {
            if ([
                'loc', 'start', 'end', 'comments', 
                'leadingComments', 'trailingComments', 'innerComments', 'extra', 'type',
                'typeAnnotation', 'returnType', 'typeParameters' 
            ].includes(key)) return;
            
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => visit(c));
            } else if (child && typeof child === 'object') {
                visit(child);
            }
        });
    };

    visit(rootNode);

    return Array.from(deps);
  }
}

export const parseVueCode = (code: string): GraphData => {
    const parser = new VueCodeParser(code);
    return parser.parse();
};