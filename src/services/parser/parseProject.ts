import { GraphData, VariableNode } from '../../entities/VariableNode';
import { parse as parseBabel } from '@babel/parser';
import { parseVueFile } from './processors/vueProcessor';
import { processVueTemplate } from './processors/templateProcessor';
import { processReactJSX } from './processors/jsxProcessor';
import { processFileRoot } from './processors/fileRootProcessor';
import { scanImports } from './core/importScanner';
import { processDeclaration } from './core/declarationProcessor';
import { processExpression } from './core/expressionProcessor';
import { resolveDependencies } from './core/dependencyResolver';
import { extractReturnStatements } from './core/returnStatementExtractor';
import { ensureDefaultExport } from './core/defaultExport';

/**
 * Main entry point - Parse a project starting from an entry file
 */
export function parseProject(files: Record<string, string>, entryFile: string): GraphData {
  const nodes = new Map<string, VariableNode>();
  const processedFiles = new Set<string>();
  const exportsRegistry = new Map<string, Map<string, string>>();

  /**
   * Process a single file
   */
  function processFile(filePath: string): void {
    if (processedFiles.has(filePath)) return;
    processedFiles.add(filePath);

    const content = files[filePath];
    if (!content) return;

    const isVue = filePath.endsWith('.vue');
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    try {
      // Parse Vue file or treat as regular script
      const parseResult = isVue
        ? parseVueFile(content)
        : {
            scriptContent: content,
            templateContent: null,
            scriptAst: null,
            templateAst: null,
            scriptStartLine: 0,
            templateStartLine: 0,
            scriptContentOffset: 0,
            templateContentOffset: 0,
          };

      const {
        scriptContent,
        templateContent,
        scriptAst,
        templateAst,
        scriptStartLine,
        templateStartLine,
        templateContentOffset,
      } = parseResult;

      // Parse script content
      const ast =
        scriptAst ||
        parseBabel(scriptContent, {
          sourceType: 'module',
          plugins: isTsx ? ['typescript', 'jsx'] : ['typescript'],
        });

      const localDefs = new Set<string>(); // Variables defined in this file

      // Step 1: Scan Imports (and recurse into imported files)
      const importedDefs = scanImports(
        ast,
        filePath,
        files,
        nodes,
        processedFiles,
        processFile,
        scriptStartLine
      );
      importedDefs.forEach((def) => localDefs.add(def));

      // Step 2: Scan Top Level Declarations
      const fileExports = new Map<string, string>(); // exportName -> nodeId

      ast.program.body.forEach((node: any) => {
        if (
          node.type === 'VariableDeclaration' ||
          node.type === 'FunctionDeclaration' ||
          node.type === 'ClassDeclaration' ||
          node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportDefaultDeclaration'
        ) {
          processDeclaration(
            node,
            scriptContent,
            scriptStartLine,
            filePath,
            localDefs,
            fileExports,
            nodes
          );
        } else if (node.type === 'ExpressionStatement') {
          // Top level calls
          processExpression(node, scriptContent, scriptStartLine, filePath, nodes);
        }
      });

      exportsRegistry.set(filePath, fileExports);

      // Step 3: Resolve Dependencies for nodes in this file
      resolveDependencies(filePath, localDefs, nodes);

      // Step 4: Extract return statements for ALL function nodes
      extractReturnStatements(filePath, scriptContent, localDefs, scriptStartLine, nodes);

      // Step 5: Handle Vue Templates and Default Export linkage
      if (isVue) {
        const templateId = processVueTemplate(
          filePath,
          templateContent,
          templateAst,
          templateStartLine,
          templateContentOffset,
          nodes
        );
        ensureDefaultExport(filePath, templateId, nodes);
      }

      // Step 6: Handle React/TSX JSX and Default Export linkage
      if (isTsx) {
        const jsxId = processReactJSX(filePath, ast, scriptContent, nodes);
        if (jsxId) {
          ensureDefaultExport(filePath, jsxId, nodes);
        }
      }

      // Step 7: Create FILE_ROOT for non-Vue/non-TSX files (pure TS files)
      if (!isVue && !isTsx) {
        const fileRootId = processFileRoot(filePath, scriptContent, localDefs, ast, nodes);
        ensureDefaultExport(filePath, fileRootId, nodes);
      }
    } catch (e) {
      console.error(`Error parsing file ${filePath}:`, e);
    }
  }

  // Start processing from entry file
  processFile(entryFile);

  return {
    nodes: Array.from(nodes.values()),
  };
}
