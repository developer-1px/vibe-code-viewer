import { parse as parseSFC } from '@vue/compiler-sfc';
import { VueFileParts } from '../types';

/**
 * Parse Vue SFC file and extract script/template parts
 */
export function parseVueFile(content: string): VueFileParts {
  const { descriptor } = parseSFC(content);

  const scriptContent = descriptor.scriptSetup?.content || descriptor.script?.content || '';
  const scriptStartLine = (descriptor.scriptSetup?.loc.start.line || descriptor.script?.loc.start.line || 1) - 1;

  // Try to parse script content
  let scriptAst = null;
  if (scriptContent) {
    try {
      const { parse: parseBabel } = require('@babel/parser');
      scriptAst = parseBabel(scriptContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
    } catch (e) {
      console.error('Failed to parse Vue script:', e);
    }
  }

  if (!descriptor.template) {
    return {
      scriptContent,
      templateContent: null,
      scriptAst,
      templateAst: null,
      scriptStartLine,
      templateStartLine: 0,
      scriptContentOffset: 0,
      templateContentOffset: 0,
    };
  }

  const templateAst = descriptor.template.ast;

  // We want to include the <template> tags in the snippet.
  // descriptor.template.content gives only inner content.
  // descriptor.template.loc.start.offset gives the start of inner content.

  const contentStart = descriptor.template.loc.start.offset;
  const contentEnd = descriptor.template.loc.end.offset;

  // Find start of <template> tag by searching backwards
  let tagStart = content.lastIndexOf('<template', contentStart);
  if (tagStart === -1) tagStart = contentStart;

  // Find end of </template> tag by searching forwards
  const closeTag = '</template>';
  let tagEnd = content.indexOf(closeTag, contentEnd);
  if (tagEnd !== -1) {
    tagEnd += closeTag.length;
  } else {
    tagEnd = contentEnd;
  }

  // Extract the full block including tags
  const templateSnippet = content.substring(tagStart, tagEnd);

  // Calculate start line of the tag (1-based)
  const templateStartLine = content.substring(0, tagStart).split('\n').length;

  // The offset to use for relative token calculations (start of the snippet)
  const templateContentOffset = tagStart;

  return {
    scriptContent,
    templateContent: templateSnippet,
    scriptAst,
    templateAst,
    scriptStartLine,
    templateStartLine,
    scriptContentOffset: 0,
    templateContentOffset,
  };
}
