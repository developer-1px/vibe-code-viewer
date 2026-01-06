/**
 * Vue Template AST Parser
 *
 * @vue/compiler-sfc를 사용한 template 분석
 */

import { type ElementNode, type Node, NodeTypes } from '@vue/compiler-core';
import { parse } from '@vue/compiler-sfc';

export interface TemplateComponent {
  name: string;
  line: number;
  column: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Vue template에서 사용된 컴포넌트 추출 (AST 기반)
 */
export function extractTemplateComponents(vueContent: string, filePath: string): TemplateComponent[] {
  try {
    const { descriptor } = parse(vueContent, { filename: filePath });

    if (!descriptor.template) {
      return [];
    }

    const templateBlock = descriptor.template;
    const components: TemplateComponent[] = [];

    // Template AST 파싱
    const templateAST = templateBlock.ast;
    if (!templateAST) return [];

    // AST 순회하며 컴포넌트 태그 찾기
    function visit(node: Node) {
      if (node.type === NodeTypes.ELEMENT) {
        const elementNode = node as ElementNode;
        const tagName = elementNode.tag;

        // PascalCase 또는 kebab-case 컴포넌트 확인
        // (대문자로 시작하거나 하이픈 포함)
        const isPascalCase = tagName[0] === tagName[0].toUpperCase();
        const isKebabCase = tagName.includes('-');

        if (isPascalCase || isKebabCase) {
          components.push({
            name: tagName,
            line: node.loc.start.line,
            column: node.loc.start.column,
            startOffset: node.loc.start.offset,
            endOffset: node.loc.end.offset,
          });
        }
      }

      // 자식 노드 순회
      if ('children' in node && Array.isArray(node.children)) {
        node.children.forEach((child) => visit(child));
      }
    }

    visit(templateAST);

    return components;
  } catch (error) {
    console.error(`❌ Error parsing Vue template AST ${filePath}:`, error);
    return [];
  }
}

/**
 * Template에서 변수 참조 추출 ({{ }}, v-for, v-if 등)
 */
export function extractTemplateVariables(
  vueContent: string,
  filePath: string
): Array<{ name: string; line: number; column: number }> {
  try {
    const { descriptor } = parse(vueContent, { filename: filePath });

    if (!descriptor.template) {
      return [];
    }

    const templateBlock = descriptor.template;
    const variables: Array<{ name: string; line: number; column: number }> = [];

    // Template AST 파싱
    const templateAST = templateBlock.ast;
    if (!templateAST) return [];

    // AST 순회하며 변수 찾기
    function visit(node: Node) {
      // Interpolation: {{ variable }}
      if (node.type === NodeTypes.INTERPOLATION) {
        // Simple identifier만 추출
        if ('content' in node && node.content.type === NodeTypes.SIMPLE_EXPRESSION) {
          const expr = node.content as any;
          if (expr.isStatic === false && expr.content) {
            variables.push({
              name: expr.content.trim(),
              line: node.loc.start.line,
              column: node.loc.start.column,
            });
          }
        }
      }

      // Directives: v-for, v-if, v-model 등
      if (node.type === NodeTypes.ELEMENT) {
        const elementNode = node as ElementNode;
        elementNode.props.forEach((prop) => {
          if (prop.type === NodeTypes.DIRECTIVE) {
            // v-for="item in items" 같은 경우
            if (prop.exp && 'content' in prop.exp) {
              const content = (prop.exp as any).content;
              if (content) {
                // 간단한 파싱 (in, of 등으로 분리)
                const parts = content.split(/\s+(?:in|of)\s+/);
                if (parts.length > 1) {
                  const varName = parts[1].trim();
                  variables.push({
                    name: varName,
                    line: prop.loc.start.line,
                    column: prop.loc.start.column,
                  });
                }
              }
            }
          }
        });
      }

      // 자식 노드 순회
      if ('children' in node && Array.isArray(node.children)) {
        node.children.forEach((child) => visit(child));
      }
    }

    visit(templateAST);

    return variables;
  } catch (error) {
    console.error(`❌ Error parsing Vue template variables ${filePath}:`, error);
    return [];
  }
}
