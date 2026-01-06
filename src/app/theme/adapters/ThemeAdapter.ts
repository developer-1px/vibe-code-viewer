/**
 * ThemeAdapter - 사용자 정의 테마 적용 시스템
 *
 * 이 파일은 미래 확장을 위한 스켈레톤입니다.
 * 현재는 CSS 변수 시스템이 테마를 관리하지만,
 * 나중에 JSON 기반 커스텀 테마 지원이 필요할 때
 * 이 Adapter를 통해 동적으로 테마를 적용할 수 있습니다.
 */

/**
 * 사용자 정의 테마 JSON 포맷
 *
 * @example
 * ```json
 * {
 *   "name": "my-theme",
 *   "colors": {
 *     "keyword": "#ff6b9d",
 *     "variable": "#c792ea",
 *     "comment": "#676e95"
 *   }
 * }
 * ```
 */
export interface ThemeJSON {
  name: string;
  colors: {
    // Basic syntax colors (mapped to --code-* CSS variables)
    keyword?: string;
    variable?: string;
    comment?: string;
    string?: string;
    number?: string;

    // Interactive element colors
    self?: string; // Definition highlights
    externalImport?: string; // Import statements
    externalClosure?: string; // Closure variables
    externalFunction?: string; // External functions
    parameter?: string; // Function parameters
    localVariable?: string; // Local variables

    [key: string]: string | undefined; // Allow additional custom colors
  };
}

/**
 * ThemeAdapter - 테마 JSON을 CSS 변수로 변환
 *
 * @example
 * ```typescript
 * const myTheme: ThemeJSON = {
 *   name: "custom-dark",
 *   colors: {
 *     keyword: "#ff6b9d",
 *     variable: "#c792ea"
 *   }
 * };
 *
 * ThemeAdapter.apply(myTheme);
 * ```
 */
export class ThemeAdapter {
  /**
   * CSS 변수 매핑 테이블
   * ThemeJSON의 키를 실제 CSS 변수명으로 변환
   */
  private static readonly CSS_VAR_MAPPING: Record<string, string> = {
    // Basic syntax
    keyword: '--code-keyword',
    variable: '--code-variable',
    comment: '--code-comment',
    string: '--code-string',
    number: '--code-number',

    // Interactive elements
    self: '--code-self',
    externalImport: '--code-external-import',
    externalClosure: '--code-external-closure',
    externalFunction: '--code-external-function',
    parameter: '--code-parameter',
    localVariable: '--code-local-variable',
  };

  /**
   * 테마 JSON을 적용하여 CSS 변수를 동적으로 변경
   *
   * @param themeJson - 적용할 테마 JSON 객체
   */
  static apply(themeJson: ThemeJSON): void {
    const root = document.documentElement;

    // JSON의 각 색상을 CSS 변수로 설정
    Object.entries(themeJson.colors).forEach(([key, value]) => {
      const cssVar = ThemeAdapter.CSS_VAR_MAPPING[key];
      if (cssVar && value) {
        root.style.setProperty(cssVar, value);
        console.log(`[ThemeAdapter] Set ${cssVar} = ${value}`);
      }
    });

    console.log(`[ThemeAdapter] Applied theme: ${themeJson.name}`);
  }

  /**
   * 테마 초기화 - 모든 커스텀 CSS 변수 제거
   */
  static reset(): void {
    const root = document.documentElement;

    Object.values(ThemeAdapter.CSS_VAR_MAPPING).forEach((cssVar) => {
      root.style.removeProperty(cssVar);
    });

    console.log('[ThemeAdapter] Reset all theme variables');
  }
}

/**
 * 향후 확장 가능성:
 *
 * 외부 테마 파일 지원이 필요할 경우 아래와 같은 Adapter 클래스를 추가할 수 있습니다:
 *
 * - VSCodeThemeAdapter: VS Code .json 테마 파일 변환
 * - JetBrainsThemeAdapter: JetBrains .icls 테마 파일 변환
 *
 * 구현 예시:
 * ```typescript
 * export class VSCodeThemeAdapter extends ThemeAdapter {
 *   static fromVSCodeJSON(vscodeTheme: any): ThemeJSON {
 *     // vscodeTheme.tokenColors에서 색상 추출
 *     return { name: '...', colors: { ... } };
 *   }
 * }
 * ```
 */
