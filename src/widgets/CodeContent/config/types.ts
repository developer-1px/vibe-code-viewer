/**
 * CodeContent Theme Configuration Types
 * JSON-serializable theme structure for code rendering
 */

export interface CodeTheme {
  typography: {
    fontSize: string;      // Tailwind text size (e.g., "text-xs")
    fontFamily: string;    // Tailwind font family (e.g., "font-mono")
    lineHeight: string;    // Tailwind line height (e.g., "leading-[1.15rem]")
  };
  colors: {
    background: string;          // Main code area background
    lineNumber: {
      text: string;              // Line number text color
      background: string;        // Line number column background
      border: string;            // Line number border color
    };
    code: {
      normal: string;            // Normal code text color
      comment: {
        normal: string;          // Comment color in normal mode
        focus: string;           // Comment color in focus mode (brighter)
      };
    };
    template: {
      text: string;              // Template text color
      clickable: {
        bg: string;              // Clickable token background
        border: string;          // Clickable token border
        text: string;            // Clickable token text color
        hoverBg: string;         // Hover background
        hoverBorder: string;     // Hover border
      };
    };
    tokens: {
      // Syntax highlighting
      text: string;              // Default text
      keyword: string;           // Keywords (const, let, function, etc.)
      punctuation: string;       // Punctuation marks
      string: string;            // String literals
      comment: string;           // Comments (normal mode)
      commentFocus: string;      // Comments (focus mode)

      // Special identifiers
      self: string;              // Declaration name (definition)
      identifier: string;        // General identifiers
      identifierWithDef: string; // Identifiers with definition

      // External dependencies
      externalImport: string;    // External imports
      externalClosure: string;   // Closure variables
      externalFunction: string;  // External functions

      // Local scope
      parameter: string;         // Function parameters
      localVariable: string;     // Local variables

      // Focus mode
      focusGrayscale: string;    // Unfocused elements in focus mode
    };
  };
  spacing: {
    containerY: string;          // Container vertical padding
    lineX: string;               // Line horizontal padding
    lineY: string;               // Line vertical padding
    lineNumberX: string;         // Line number padding right
  };
  dimensions: {
    lineNumberWidth: string;     // Line number column width
    slotSize: string;            // Slot width and height
    slotSpacing: number;         // Slot horizontal stagger (in pixels)
  };
}
