/**
 * Vue SFC Script Extractor
 *
 * Vue 파일의 <script> 부분만 추출하여 TypeScript로 분석
 */

import { parse } from '@vue/compiler-sfc';

/**
 * Vue SFC에서 <script> 코드 추출
 */
export function extractVueScript(vueContent: string, filePath: string): string | null {
  try {
    const { descriptor } = parse(vueContent, { filename: filePath });

    // <script setup> 또는 <script> 추출
    const script = descriptor.scriptSetup || descriptor.script;

    if (!script) {
      console.warn(`⚠️ No script found in Vue file: ${filePath}`);
      return null;
    }

    return script.content;
  } catch (error) {
    console.error(`❌ Error parsing Vue file ${filePath}:`, error);
    return null;
  }
}

/**
 * Vue SFC에서 <template> 전체 추출 (태그 포함)
 */
export function extractVueTemplate(vueContent: string, filePath: string): string | null {
  try {
    const { descriptor } = parse(vueContent, { filename: filePath });

    if (!descriptor.template) {
      return null;
    }

    // <template>부터 </template>까지 전체 추출
    const templateBlock = descriptor.template;
    const startTag = '<template>';
    const endTag = '</template>';
    const fullTemplate = `${startTag}\n${templateBlock.content}\n${endTag}`;

    return fullTemplate;
  } catch (error) {
    console.error(`❌ Error parsing Vue template ${filePath}:`, error);
    return null;
  }
}

/**
 * Vue 파일인지 확인
 */
export function isVueFile(filePath: string): boolean {
  return filePath.endsWith('.vue');
}
