/**
 * TypeScript Language Service wrapper for Go to Definition
 */
import * as ts from 'typescript';
import type { DefinitionLocation } from '../model/types';

/**
 * TypeScript Language Service를 사용하여 identifier의 정의 위치를 찾습니다
 */
export function findDefinitionLocation(
  code: string,
  filePath: string,
  position: number,
  isTsx: boolean
): DefinitionLocation | null {
  try {
    // Create source file
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // Create a minimal language service host
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => [sourceFile.fileName],
      getScriptVersion: () => '0',
      getScriptSnapshot: (fileName) => {
        if (fileName === sourceFile.fileName) {
          return ts.ScriptSnapshot.fromString(code);
        }
        return undefined;
      },
      getCurrentDirectory: () => '/',
      getCompilationSettings: () => ({
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        jsx: isTsx ? ts.JsxEmit.React : undefined,
        allowJs: true,
        strict: false,
      }),
      getDefaultLibFileName: () => 'lib.d.ts', // Browser-safe: return dummy lib file name
      fileExists: () => true,
      readFile: () => undefined,
      readDirectory: () => [],
      directoryExists: () => true,
      getDirectories: () => [],
    };

    // Create language service
    const languageService = ts.createLanguageService(host);

    // Get definition at position
    const definitions = languageService.getDefinitionAtPosition(
      sourceFile.fileName,
      position
    );

    if (!definitions || definitions.length === 0) {
      return null;
    }

    // Use the first definition
    const def = definitions[0];
    const defSourceFile = languageService.getProgram()?.getSourceFile(def.fileName);

    if (!defSourceFile) {
      return null;
    }

    const { line, character } = defSourceFile.getLineAndCharacterOfPosition(def.textSpan.start);

    return {
      filePath: def.fileName,
      line: line + 1, // Convert to 1-based
      character: character + 1,
      fileName: def.fileName.split('/').pop() || def.fileName,
    };
  } catch (error) {
    console.error('[findDefinitionLocation] Error:', error);
    return null;
  }
}

/**
 * Get quick info (hover information) at position
 */
export function getQuickInfoAtPosition(
  code: string,
  position: number,
  isTsx: boolean
): string | null {
  try {
    const sourceFile = ts.createSourceFile(
      isTsx ? 'temp.tsx' : 'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => [sourceFile.fileName],
      getScriptVersion: () => '0',
      getScriptSnapshot: (fileName) => {
        if (fileName === sourceFile.fileName) {
          return ts.ScriptSnapshot.fromString(code);
        }
        return undefined;
      },
      getCurrentDirectory: () => '/',
      getCompilationSettings: () => ({
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        jsx: isTsx ? ts.JsxEmit.React : undefined,
        allowJs: true,
        strict: false,
      }),
      getDefaultLibFileName: () => 'lib.d.ts', // Browser-safe: return dummy lib file name
      fileExists: () => true,
      readFile: () => undefined,
      readDirectory: () => [],
      directoryExists: () => true,
      getDirectories: () => [],
    };

    const languageService = ts.createLanguageService(host);
    const quickInfo = languageService.getQuickInfoAtPosition(sourceFile.fileName, position);

    if (!quickInfo) {
      return null;
    }

    // Extract display parts
    const displayString = quickInfo.displayParts
      ?.map(part => part.text)
      .join('');

    return displayString || null;
  } catch (error) {
    console.error('[getQuickInfoAtPosition] Error:', error);
    return null;
  }
}
