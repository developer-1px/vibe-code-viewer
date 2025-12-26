import { CanvasNode } from '../../entities/VariableNode';

// --- Constants ---
export const LEVEL_SPACING = 700; // Horizontal space between columns
export const VERTICAL_GAP = 60; // Gap between vertically stacked nodes
export const CHAR_WRAP_LIMIT = 120; // Estimated characters per line before wrapping

// --- Helpers ---

// Helper to check if node exists in current branch to prevent infinite cycles
export const hasCycle = (path: string[], nextId: string) => {
    return path.includes(nextId);
};

// Helper to find the first usage index of a variable in a code snippet
export const getUsageIndex = (code: string, id: string) => {
    // Extract short name from full ID (e.g. "src/file.ts::varName" -> "varName")
    const shortId = id.split('::').pop() || id;
    try {
        const escapedId = shortId.replace(/\$/g, '\\$');
        // Look for the identifier ensuring it's not part of another word
        const regex = new RegExp(`(?<![a-zA-Z0-9_$])${escapedId}(?![a-zA-Z0-9_$])`);
        const match = regex.exec(code);
        return match ? match.index : Infinity;
    } catch (e) {
        return code.indexOf(shortId);
    }
};

// Helper to estimate the rendered height of a node with wrapping
export const estimateNodeHeight = (node: CanvasNode) => {
    if (!node.codeSnippet) return 60;
    const lines = node.codeSnippet.split('\n');
    
    let visualLineCount = 0;
    lines.forEach(line => {
        const length = line.length;
        if (length === 0) {
            visualLineCount += 1;
        } else {
            visualLineCount += Math.ceil(length / CHAR_WRAP_LIMIT);
        }
    });

    const baseHeight = 60; // Header + padding
    const lineHeight = 20; // Approximation of line-height in pixels
    return baseHeight + (visualLineCount * lineHeight);
};