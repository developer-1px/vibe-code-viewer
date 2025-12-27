import { VariableNode } from '../../../entities/VariableNode';
import { resolvePath, findFileInProject, findFileByName } from '../pathUtils';
import { isPrimitive } from '../constants';

/**
 * Scan and process import declarations
 * - Recursively processes imported files
 * - Creates import nodes in the current file
 * - Returns set of local definitions added
 */
export function scanImports(
  ast: any,
  filePath: string,
  files: Record<string, string>,
  nodes: Map<string, VariableNode>,
  processedFiles: Set<string>,
  processFile: (path: string) => void,
  startLineOffset: number = 0
): Set<string> {
  const localDefs = new Set<string>();

  ast.program.body.forEach((node: any) => {
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value;
      const resolvedPath = resolvePath(filePath, source);
      const targetFile =
        (resolvedPath && findFileInProject(files, resolvedPath)) ||
        (source && findFileByName(files, source)) ||
        null;

      if (targetFile) {
        // Recurse to process the imported file
        processFile(targetFile);

        // Map imports
        node.specifiers.forEach((spec: any) => {
          if (spec.type === 'ImportSpecifier') {
            const importedName =
              spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
            const localName = spec.local.name;

            // Check if imported item is a primitive (re-export edge case or named import)
            if (isPrimitive(importedName)) return;

            // Construct ID of the remote node
            const remoteId = `${targetFile}::${importedName}`;

            // Default export handling
            const remoteDefaultId = `${targetFile}::default`;
            const finalRemoteId = importedName === 'default' ? remoteDefaultId : remoteId;

            const importNodeId = `${filePath}::${localName}`;
            nodes.set(importNodeId, {
              id: importNodeId,
              label: localName,
              filePath,
              type: 'module',
              codeSnippet: `import { ${importedName} } from '${source}'`,
              startLine: node.loc.start.line + startLineOffset,
              dependencies: [finalRemoteId], // Always add dependency to enable cross-file linking
            });

            localDefs.add(localName);
          } else if (spec.type === 'ImportDefaultSpecifier') {
            const localName = spec.local.name;
            const remoteDefaultId = `${targetFile}::default`;

            const importNodeId = `${filePath}::${localName}`;
            nodes.set(importNodeId, {
              id: importNodeId,
              label: localName,
              filePath,
              type: 'module',
              codeSnippet: `import ${localName} from '${source}'`,
              startLine: node.loc.start.line + startLineOffset,
              dependencies: [remoteDefaultId],
            });
            localDefs.add(localName);
          }
        });
      } else {
        // External import
        node.specifiers.forEach((spec: any) => {
          const localName = spec.local.name;

          // Check imported name for named imports
          let importedName = localName;
          if (spec.type === 'ImportSpecifier') {
            importedName =
              spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
          }

          // Skip node creation for primitives
          if (isPrimitive(importedName)) return;

          const importNodeId = `${filePath}::${localName}`;
          nodes.set(importNodeId, {
            id: importNodeId,
            label: localName,
            filePath,
            type: 'module',
            codeSnippet: `import ... from '${source}'`,
            startLine: node.loc.start.line + startLineOffset,
            dependencies: [],
          });
          localDefs.add(localName);
        });
      }
    }
  });

  return localDefs;
}
