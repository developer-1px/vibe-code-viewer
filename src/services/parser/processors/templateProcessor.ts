import { VariableNode } from '../../../entities/VariableNode';
import { parseVueTemplate } from '../vueTemplateParser';

/**
 * Process Vue template and create TEMPLATE_ROOT node
 */
export function processVueTemplate(
  filePath: string,
  templateContent: string | null,
  templateAst: any,
  templateStartLine: number,
  templateContentOffset: number,
  nodes: Map<string, VariableNode>
): string | null {
  if (!templateContent || !templateAst) return null;

  const templateId = `${filePath}::TEMPLATE_ROOT`;

  // Get all variables defined in this file
  const fileVars = Array.from(nodes.values()).filter((n) => n.filePath === filePath);
  const fileVarNames = new Set(fileVars.map((n) => n.id.split('::').pop()!));

  // Parse template using dedicated parser (adjust offsets to be relative to templateContent)
  const parseResult = parseVueTemplate(templateAst, fileVarNames, templateContentOffset);

  const fileName = filePath.split('/').pop() || 'Component';
  const templateNode: VariableNode = {
    id: templateId,
    label: `${fileName} <template>`,
    filePath,
    type: 'template',
    codeSnippet: templateContent, // Don't trim! AST offsets are based on original content
    startLine: templateStartLine,
    dependencies: parseResult.dependencies.map((name) => `${filePath}::${name}`),
    templateTokenRanges: parseResult.tokenRanges.map((range) => ({
      ...range,
      tokenIds: range.tokenIds.map((name: string) => `${filePath}::${name}`),
    })),
  };

  nodes.set(templateId, templateNode);
  return templateId;
}
