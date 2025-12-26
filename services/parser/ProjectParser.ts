import { GraphData, VariableNode } from '../../entities/VariableNode';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseBabel } from '@babel/parser';
import { resolvePath, findFileInProject, findFileByName } from './pathUtils';
import { extractIdentifiersFromPattern, findDependenciesInAST, traverseTemplateAST } from './astUtils';

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

  private processFile(filePath: string) {
    if (this.processedFiles.has(filePath)) return;
    this.processedFiles.add(filePath);

    const content = this.files[filePath];
    if (!content) return;

    const isVue = filePath.endsWith('.vue');
    let scriptContent = content;
    let templateContent = null;
    let templateAst = null;
    let templateStartLine = 0;
    let startLineOffset = 0;

    if (isVue) {
        const { descriptor } = parseSFC(content);
        if (descriptor.scriptSetup || descriptor.script) {
            scriptContent = (descriptor.scriptSetup?.content || descriptor.script?.content || '');
            startLineOffset = (descriptor.scriptSetup?.loc.start.line || descriptor.script?.loc.start.line || 1) - 1;
        } else {
            // Vue file with no script, treat as empty script?
            scriptContent = '';
        }
        
        if (descriptor.template) {
            templateContent = descriptor.template.content;
            templateAst = descriptor.template.ast;
            templateStartLine = descriptor.template.loc.start.line;
        }
    }

    try {
        const ast = parseBabel(scriptContent, {
            sourceType: 'module',
            plugins: ['typescript']
        });

        const localDefs = new Set<string>(); // Variables defined in this file
        const importedBindings = new Map<string, string>(); 

        // 1. Scan Imports First (and recurse)
        ast.program.body.forEach((node: any) => {
            if (node.type === 'ImportDeclaration') {
                const source = node.source.value;
                const resolvedPath = resolvePath(filePath, source);
                let targetFile = resolvedPath ? findFileInProject(this.files, resolvedPath) : null;

                // Fallback: If path resolution failed, try to find by filename
                if (!targetFile && source) {
                    targetFile = findFileByName(this.files, source);
                    if (targetFile) {
                        console.log(`📁 Fallback: Found "${source}" as "${targetFile}"`);
                    }
                }

                if (targetFile) {
                    // Recurse
                    this.processFile(targetFile);
                    
                    // Map imports
                    node.specifiers.forEach((spec: any) => {
                        if (spec.type === 'ImportSpecifier') {
                            const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
                            const localName = spec.local.name;
                            
                            // Find the export ID in the target file
                            const targetExportMap = this.exportsRegistry.get(targetFile);
                            const exportId = targetExportMap?.get(importedName); 
                            
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
                this.processExpression(node, scriptContent, startLineOffset, filePath, localDefs);
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

        // 4. Handle Vue Templates (For ALL Vue files)
        let templateId: string | null = null;
        if (isVue && templateContent) {
            templateId = `${filePath}::TEMPLATE_ROOT`;
            
            // Find dependencies of template
            const templateDeps = new Set<string>();
            const fileVars = Array.from(this.nodes.values()).filter(n => n.filePath === filePath);
            const fileVarNames = new Set(fileVars.map(n => n.id.split('::').pop()!));
            
            if (templateAst) {
                 traverseTemplateAST(templateAst, fileVarNames, templateDeps);
            }
            
            const templateNode: VariableNode = {
                 id: templateId,
                 label: '<template>',
                 filePath,
                 type: 'template',
                 codeSnippet: templateContent.trim(),
                 startLine: templateStartLine,
                 dependencies: Array.from(templateDeps).map(name => `${filePath}::${name}`)
            };
            this.nodes.set(templateId, templateNode);
        }

        // 5. Ensure "Default Export" linkage for Vue files
        // If external files import this Vue file, they look for `::default`.
        // We ensure `::default` exists and links to the template.
        if (isVue) {
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
     let targetNode = node;
     let isExport = false;
     let isDefaultExport = false;

     if (node.type === 'ExportNamedDeclaration') {
         isExport = true;
         targetNode = node.declaration;
     } else if (node.type === 'ExportDefaultDeclaration') {
         isExport = true;
         isDefaultExport = true;
         targetNode = node.declaration;
     }

     if (!targetNode) return;

     if (targetNode.type === 'VariableDeclaration') {
         targetNode.declarations.forEach((decl: any) => {
             const ids = extractIdentifiersFromPattern(decl.id);
             const initCode = decl.init ? getSnippet(decl.init) : '';
             let type: VariableNode['type'] = 'ref';
             if (initCode.includes('computed')) type = 'computed';
             else if (initCode.includes('use') && !initCode.includes('useRoute')) type = 'hook';
             else if (initCode.includes('storeToRefs')) type = 'store';

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

  private processExpression(node: any, code: string, lineOffset: number, filePath: string, localDefs: Set<string>) {
        const expr = node.expression;
        const isCall = expr.type === 'CallExpression';
        const isAwaitCall = expr.type === 'AwaitExpression' && expr.argument.type === 'CallExpression';
        
        if (isCall || isAwaitCall) {
           const callExpr = isCall ? expr : expr.argument;
           let label = 'Expression';
           if (callExpr.callee.type === 'Identifier') {
               label = `${callExpr.callee.name}()`;
           } else if (callExpr.callee.type === 'MemberExpression') {
               label = `${callExpr.callee.property.name}()`;
           }
           if (isAwaitCall) label = `await ${label}`;

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