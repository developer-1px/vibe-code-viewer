import { GraphData, VariableNode } from '../../entities/VariableNode';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseBabel } from '@babel/parser';
import { resolvePath, findFileInProject, findFileByName } from './pathUtils';
import { extractIdentifiersFromPattern, findDependenciesInAST } from './astUtils';
import { parseVueTemplate } from './vueTemplateParser';

export class ProjectParser {
  private files: Record<string, string>;
  private nodes: Map<string, VariableNode> = new Map(); // Key: filePath::localName
  private processedFiles: Set<string> = new Set();
  
  // To link imports to exports
  // Map<FilePath, Map<ExportName, NodeID>>
  private exportsRegistry: Map<string, Map<string, string>> = new Map();

  constructor(files: Record<string, string>) {
    this.files = files;
  }

  public parseProject(entryFile: string): GraphData {
    this.processFile(entryFile);
    return {
      nodes: Array.from(this.nodes.values())
    };
  }

  private parseVueFile(content: string) {
    const { descriptor } = parseSFC(content);

    const scriptContent = descriptor.scriptSetup?.content || descriptor.script?.content || '';
    const startLineOffset = (descriptor.scriptSetup?.loc.start.line || descriptor.script?.loc.start.line || 1) - 1;

    if (!descriptor.template) {
        return { scriptContent, templateContent: null, templateAst: null, templateStartLine: 0, startLineOffset, templateContentOffset: 0 };
    }

    const templateContent = descriptor.template.content;
    const templateAst = descriptor.template.ast;

    // CRITICAL: AST offset is based on the full file, but templateContent is extracted
    // We need to pass the base offset so lineUtils can adjust
    const templateContentOffset = descriptor.template.loc.start.offset;

    // Find the first real line of template content (skip <template> tag itself)
    const firstRealNode = templateAst?.children?.find((c: any) => c.type !== 2 || c.content.trim().length > 0);
    const templateStartLine = firstRealNode?.loc.start.line ?? descriptor.template.loc.start.line + 1;

    console.log('📋 Template offset info:');
    console.log('   templateContentOffset:', templateContentOffset);
    console.log('   templateContent.length:', templateContent.length);
    console.log('   templateContent first 100 chars:', templateContent.substring(0, 100));

    return { scriptContent, templateContent, templateAst, templateStartLine, startLineOffset, templateContentOffset };
  }

  private processVueTemplate(filePath: string, templateContent: string | null, templateAst: any, templateStartLine: number, templateContentOffset: number): string | null {
    if (!templateContent || !templateAst) return null;

    const templateId = `${filePath}::TEMPLATE_ROOT`;

    // Get all variables defined in this file
    const fileVars = Array.from(this.nodes.values()).filter(n => n.filePath === filePath);
    const fileVarNames = new Set(fileVars.map(n => n.id.split('::').pop()!));

    // Parse template using dedicated parser (adjust offsets to be relative to templateContent)
    const parseResult = parseVueTemplate(templateAst, fileVarNames, templateContentOffset);

    console.log('🔍 Template Parse Result:', filePath);
    console.log('   dependencies:', parseResult.dependencies);
    console.log('   tokenRanges:', parseResult.tokenRanges.length, 'ranges');

    const fileName = filePath.split('/').pop() || 'Component';
    const templateNode: VariableNode = {
         id: templateId,
         label: `${fileName} <template>`,
         filePath,
         type: 'template',
         codeSnippet: templateContent, // Don't trim! AST offsets are based on original content
         startLine: templateStartLine,
         dependencies: parseResult.dependencies.map(name => `${filePath}::${name}`),
         templateTokenRanges: parseResult.tokenRanges.map(range => ({
             ...range,
             tokenIds: range.tokenIds.map((name: string) => `${filePath}::${name}`)
         }))
    };

    this.nodes.set(templateId, templateNode);
    return templateId;
  }

  private ensureDefaultExport(filePath: string, templateId: string | null) {
    const defaultId = `${filePath}::default`;

    // If explicit export default wasn't found (e.g. script setup), create a synthetic node
    if (!this.nodes.has(defaultId)) {
         this.nodes.set(defaultId, {
            id: defaultId,
            label: filePath.split('/').pop() || 'Component',
            filePath,
            type: 'module',
            codeSnippet: '', // Virtual node
            startLine: 0,
            dependencies: []
         });
    }

    const defaultNode = this.nodes.get(defaultId)!;
    // The Component (Default Export) depends on the Template (Visual Structure)
    // This ensures when you expand "Import X", you see the Template of X.
    if (templateId && !defaultNode.dependencies.includes(templateId)) {
        defaultNode.dependencies.push(templateId);
    }
  }

  private processFile(filePath: string) {
    if (this.processedFiles.has(filePath)) return;
    this.processedFiles.add(filePath);

    const content = this.files[filePath];
    if (!content) return;

    const isVue = filePath.endsWith('.vue');
    const parseResult = isVue ? this.parseVueFile(content) : {
        scriptContent: content,
        templateContent: null,
        templateAst: null,
        templateStartLine: 0,
        startLineOffset: 0,
        templateContentOffset: 0
    };

    const { scriptContent, templateContent, templateAst, templateStartLine, startLineOffset, templateContentOffset } = parseResult;

    try {
        const ast = parseBabel(scriptContent, {
            sourceType: 'module',
            plugins: ['typescript']
        });

        const localDefs = new Set<string>(); // Variables defined in this file

        // 1. Scan Imports First (and recurse)
        ast.program.body.forEach((node: any) => {
            if (node.type === 'ImportDeclaration') {
                const source = node.source.value;
                const resolvedPath = resolvePath(filePath, source);
                const targetFile = (resolvedPath && findFileInProject(this.files, resolvedPath)) ||
                                   (source && findFileByName(this.files, source)) ||
                                   null;

                if (targetFile) {
                    // Recurse
                    this.processFile(targetFile);
                    
                    // Map imports
                    node.specifiers.forEach((spec: any) => {
                        if (spec.type === 'ImportSpecifier') {
                            const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
                            const localName = spec.local.name;

                            // Construct ID of the remote node
                            const remoteId = `${targetFile}::${importedName}`;
                            
                            // Default export handling
                            const remoteDefaultId = `${targetFile}::default`;
                            const finalRemoteId = importedName === 'default' ? remoteDefaultId : remoteId;
                            
                            const importNodeId = `${filePath}::${localName}`;
                            this.nodes.set(importNodeId, {
                                id: importNodeId,
                                label: localName,
                                filePath,
                                type: 'module',
                                codeSnippet: `import { ${importedName} } from '${source}'`,
                                startLine: node.loc.start.line + startLineOffset,
                                dependencies: [finalRemoteId] // Always add dependency to enable cross-file linking
                            });
                            
                            localDefs.add(localName);
                        } else if (spec.type === 'ImportDefaultSpecifier') {
                             const localName = spec.local.name;
                             const remoteDefaultId = `${targetFile}::default`;
                             
                             const importNodeId = `${filePath}::${localName}`;
                             this.nodes.set(importNodeId, {
                                id: importNodeId,
                                label: localName,
                                filePath,
                                type: 'module',
                                codeSnippet: `import ${localName} from '${source}'`,
                                startLine: node.loc.start.line + startLineOffset,
                                dependencies: [remoteDefaultId] 
                             });
                             localDefs.add(localName);
                        }
                    });
                } else {
                    // External import
                    node.specifiers.forEach((spec: any) => {
                         const localName = spec.local.name;
                         const importNodeId = `${filePath}::${localName}`;
                         this.nodes.set(importNodeId, {
                             id: importNodeId,
                             label: localName,
                             filePath,
                             type: 'module',
                             codeSnippet: `import ... from '${source}'`,
                             startLine: node.loc.start.line + startLineOffset,
                             dependencies: []
                         });
                         localDefs.add(localName);
                    });
                }
            }
        });

        // 2. Scan Top Level Declarations
        const fileExports = new Map<string, string>(); // exportName -> nodeId

        ast.program.body.forEach((node: any) => {
            if (node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
                this.processDeclaration(node, scriptContent, startLineOffset, filePath, localDefs, fileExports);
            } else if (node.type === 'ExpressionStatement') {
                // Top level calls
                this.processExpression(node, scriptContent, startLineOffset, filePath);
            }
        });

        this.exportsRegistry.set(filePath, fileExports);

        // 3. Resolve Dependencies for nodes in this file
        this.nodes.forEach(node => {
            if (node.filePath === filePath && node.type !== 'template') {
                // @ts-ignore
                if (node.astNode) {
                    // @ts-ignore
                    const deps = findDependenciesInAST(node.astNode, localDefs, node.id);
                    // Add deps: convert local name to local ID
                    deps.forEach(dName => {
                        const dId = `${filePath}::${dName}`;
                        if (this.nodes.has(dId) && !node.dependencies.includes(dId)) {
                            node.dependencies.push(dId);
                        }
                    });
                }
            }
        });

        // 4. Handle Vue Templates and Default Export linkage
        if (isVue) {
            const templateId = this.processVueTemplate(filePath, templateContent, templateAst, templateStartLine, templateContentOffset);
            this.ensureDefaultExport(filePath, templateId);
        }

    } catch (e) {
        console.error(`Error parsing file ${filePath}:`, e);
    }
  }

  private processDeclaration(node: any, code: string, lineOffset: number, filePath: string, localDefs: Set<string>, fileExports: Map<string, string>) {
     const getSnippet = (n: any) => code.substring(n.start, n.end);
     const getLine = (n: any) => n.loc.start.line + lineOffset;

     const createNode = (name: string, type: VariableNode['type'], astNode: any, isExported: boolean = false, exportName: string = name) => {
         const id = `${filePath}::${name}`;
         this.nodes.set(id, {
             id,
             label: name,
             filePath,
             type,
             codeSnippet: getSnippet(node), 
             startLine: getLine(node),
             dependencies: [],
             // @ts-ignore
             astNode
         });
         localDefs.add(name);
         if (isExported) {
             fileExports.set(exportName, id);
         }
     };

     // Handle Exports wrapper
     const isExport = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';
     const isDefaultExport = node.type === 'ExportDefaultDeclaration';
     const targetNode = isExport ? node.declaration : node;

     if (!targetNode) return;

     const inferType = (initCode: string): VariableNode['type'] => {
         if (initCode.includes('computed')) return 'computed';
         if (initCode.includes('use') && !initCode.includes('useRoute')) return 'hook';
         if (initCode.includes('storeToRefs')) return 'store';
         return 'ref';
     };

     if (targetNode.type === 'VariableDeclaration') {
         targetNode.declarations.forEach((decl: any) => {
             const ids = extractIdentifiersFromPattern(decl.id);
             const initCode = decl.init ? getSnippet(decl.init) : '';
             const type = inferType(initCode);

             ids.forEach(name => createNode(name, type, decl.init, isExport));
         });
     } else if (targetNode.type === 'FunctionDeclaration') {
         const name = targetNode.id ? targetNode.id.name : 'default';
         // Pass entire function node (not just body) to preserve parameter info
         createNode(name, 'function', targetNode, isExport, isDefaultExport ? 'default' : name);
     } else if (targetNode.type === 'ClassDeclaration') {
         const name = targetNode.id ? targetNode.id.name : 'default';
         // Pass entire class node to preserve constructor/method info
         createNode(name, 'function', targetNode, isExport, isDefaultExport ? 'default' : name);
     }
  }

  private processExpression(node: any, code: string, lineOffset: number, filePath: string) {
        const expr = node.expression;
        const isCall = expr.type === 'CallExpression';
        const isAwaitCall = expr.type === 'AwaitExpression' && expr.argument.type === 'CallExpression';

        if (isCall || isAwaitCall) {
           const callExpr = isCall ? expr : expr.argument;
           const baseLabel = callExpr.callee.type === 'Identifier' ? `${callExpr.callee.name}()` :
                             callExpr.callee.type === 'MemberExpression' ? `${callExpr.callee.property.name}()` :
                             'Expression';
           const label = isAwaitCall ? `await ${baseLabel}` : baseLabel;

           const id = `${filePath}::setup_call_${node.loc.start.line}`;

           this.nodes.set(id, {
               id,
               label,
               filePath,
               type: 'call',
               codeSnippet: code.substring(node.start, node.end),
               startLine: node.loc.start.line + lineOffset,
               dependencies: [],
               // @ts-ignore
               astNode: expr
           });
        }
  }
}