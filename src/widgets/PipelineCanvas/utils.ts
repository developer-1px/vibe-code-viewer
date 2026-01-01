
import { CanvasNode } from '../../entities/CanvasNode';
import { SourceFileNode } from '../../entities/SourceFileNode';

// --- Constants ---
export const LEVEL_SPACING = 850; // Horizontal space between columns
export const VERTICAL_GAP = 150; // Gap between vertically stacked nodes
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
    const totalHeight = baseHeight + (visualLineCount * lineHeight);

    return totalHeight;
};

/**
 * Calculates which nodes are still reachable from the Entry File or Template Root.
 * Any node currently in `visibleSet` that cannot be reached is considered an "orphan" and removed.
 */
export const pruneDetachedNodes = (
    visibleSet: Set<string>,
    nodeMap: Map<string, SourceFileNode>,
    entryFile: string,
    templateRootId: string | null
): Set<string> => {
    const visited = new Set<string>();
    const queue: string[] = [];

    // 1. Identify Roots within the Visible Set
    // A node is a valid "root" source if it is in the Entry File OR it is the Template Root
    visibleSet.forEach(id => {
        const node = nodeMap.get(id);
        if (!node) return;

        // Is it an anchor point?
        // - It's the designated Template/JSX Root
        // - OR It belongs to the entry file (e.g. setup calls, top level variables)
        const isEntryPoint = node.filePath === entryFile; 
        const isTemplateRoot = id === templateRootId;

        if (isEntryPoint || isTemplateRoot) {
            if (!visited.has(id)) {
                visited.add(id);
                queue.push(id);
            }
        }
    });

    // 2. BFS Traversal to find all reachable nodes
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const node = nodeMap.get(currentId);

        if (node) {
            node.dependencies.forEach(depId => {
                // We can only traverse to a node if it is currently 'visible' (enabled by user)
                // If the user turned off a node, the path stops there.
                if (visibleSet.has(depId) && !visited.has(depId)) {
                    visited.add(depId);
                    queue.push(depId);
                }
            });
        }
    }

    // 3. The new visible set is exactly what we could reach.
    // Anything in 'visibleSet' but NOT in 'visited' was cut off.
    return visited;
};
