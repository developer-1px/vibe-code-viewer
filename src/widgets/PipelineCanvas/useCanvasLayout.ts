import { useEffect, useState, useMemo } from 'react';
import { useSetAtom } from 'jotai';
import { GraphData, VariableNode } from '../../entities/VariableNode';
import { CanvasNode, ComponentGroup } from '../../entities/CanvasNode';
import { LEVEL_SPACING, VERTICAL_GAP, estimateNodeHeight, getUsageIndex, hasCycle } from './utils.ts';
import {
  layoutNodesAtom,
  fullNodeMapAtom,
  entryFileAtom,
  templateRootIdAtom,
  visibleNodeIdsAtom
} from '../../store/atoms';

// Visual Tree Structure for Layout Calculation
interface VisualTreeNode extends CanvasNode {
    children: VisualTreeNode[];
    subtreeHeight: number; 
}

export const useCanvasLayout = (
    initialData: GraphData | null,
    entryFile: string,
    visibleNodeIds: Set<string>
) => {
    const [layoutNodes, setLayoutNodes] = useState<CanvasNode[]>([]);
    const [layoutLinks, setLayoutLinks] = useState<{source: string, target: string}[]>([]);
    const [componentGroups, setComponentGroups] = useState<ComponentGroup[]>([]);

    // Atom setters
    const setLayoutNodesAtom = useSetAtom(layoutNodesAtom);
    const setFullNodeMapAtom = useSetAtom(fullNodeMapAtom);
    const setEntryFileAtom = useSetAtom(entryFileAtom);
    const setTemplateRootIdAtom = useSetAtom(templateRootIdAtom);
    const setVisibleNodeIdsAtom = useSetAtom(visibleNodeIdsAtom);

    const fullNodeMap = useMemo(() => {
        if (!initialData) return new Map<string, VariableNode>();
        return new Map<string, VariableNode>(initialData.nodes.map(n => [n.id, n]));
    }, [initialData]);

    // Template Root ID (or FILE_ROOT for non-Vue files)
    const templateRootId = useMemo(() => {
        // Try TEMPLATE_ROOT first (Vue files)
        const templateId = `${entryFile}::TEMPLATE_ROOT`;
        if (fullNodeMap.has(templateId)) return templateId;

        // Try JSX_ROOT (TSX files)
        const jsxId = `${entryFile}::JSX_ROOT`;
        if (fullNodeMap.has(jsxId)) return jsxId;

        // Try FILE_ROOT (non-Vue/TSX files: .ts, .js)
        const fileRootId = `${entryFile}::FILE_ROOT`;
        if (fullNodeMap.has(fileRootId)) return fileRootId;

        return null;
    }, [initialData, entryFile, fullNodeMap]);

    // --- Core Layout Algorithm ---
    useEffect(() => {
        if (fullNodeMap.size === 0) return;

        const rootId = 'VIRTUAL_ROOT';
        
        // Determine roots
        const rootDeps: string[] = [];
        if (templateRootId) rootDeps.push(templateRootId);
        
        // Add visible call nodes from entry file
        Array.from(fullNodeMap.values()).forEach((n: VariableNode) => {
            if (n.type === 'call' && n.filePath === entryFile) {
                rootDeps.push(n.id);
            }
        });

        const layoutNodeMap = new Map<string, VariableNode>(fullNodeMap);
        layoutNodeMap.set(rootId, {
            id: rootId,
            label: 'ROOT',
            type: 'template',
            filePath: 'virtual',
            codeSnippet: '',
            startLine: 0,
            dependencies: rootDeps,
        });

        const visited = new Set<string>();
        const extraLinks: {source: string, target: string}[] = [];

        // 1. Build Visual Tree
        const buildVisualTree = (nodeId: string, level: number, path: string[], parentId: string | null): VisualTreeNode | null => {
            if (visited.has(nodeId)) {
                if (parentId && parentId !== 'VIRTUAL_ROOT') {
                    extraLinks.push({ source: nodeId, target: parentId });
                }
                return null;
            }

            visited.add(nodeId);

            const raw = layoutNodeMap.get(nodeId)!;

            // Skip nodes with empty code snippets (virtual intermediate nodes)
            if (!raw.codeSnippet || raw.codeSnippet.trim() === '') {
                // Process dependencies but don't create a visual node
                const node: VisualTreeNode = {
                    ...raw,
                    level,
                    x: 0,
                    y: 0,
                    isVisible: false,
                    visualId: nodeId,
                    children: [],
                    subtreeHeight: 0
                };

                raw.dependencies.forEach(depId => {
                    const isVisible = visibleNodeIds.has(depId) || nodeId === 'VIRTUAL_ROOT';
                    if (isVisible && !hasCycle(path, depId) && layoutNodeMap.has(depId)) {
                        const child = buildVisualTree(depId, level, [...path, nodeId], nodeId);
                        if (child) {
                            node.children.push(child);
                        }
                    }
                });

                // Return children directly to parent (flatten this node out)
                if (node.children.length === 1) {
                    return node.children[0];
                } else if (node.children.length > 1) {
                    // If multiple children, we need to keep structure but not display this node
                    return node;
                }
                return null;
            }

            const visualId = nodeId; 
            
            const node: VisualTreeNode = {
                ...raw,
                level,
                x: 0,
                y: 0,
                isVisible: true,
                visualId,
                children: [],
                subtreeHeight: 0
            };

            const sortedDeps = [...raw.dependencies].sort((a, b) => {
                const indexA = getUsageIndex(raw.codeSnippet, a);
                const indexB = getUsageIndex(raw.codeSnippet, b);
                if (indexA !== indexB) return indexA - indexB;
                const nodeA = layoutNodeMap.get(a);
                const nodeB = layoutNodeMap.get(b);
                return (nodeA?.startLine || 0) - (nodeB?.startLine || 0);
            });

            sortedDeps.forEach(depId => {
                const isVisible = visibleNodeIds.has(depId) || nodeId === 'VIRTUAL_ROOT';
                if (isVisible && !hasCycle(path, depId) && layoutNodeMap.has(depId)) {
                    const child = buildVisualTree(depId, level + 1, [...path, nodeId], nodeId);
                    if (child) {
                        node.children.push(child);
                    }
                }
            });

            return node;
        };

        const treeRoot = buildVisualTree(rootId, 0, [], null);
        if (!treeRoot) return;

        // 2. Compute Heights
        const computeHeights = (node: VisualTreeNode) => {
            const myHeight = (node.id === 'VIRTUAL_ROOT' || node.isVisible === false) ? 0 : estimateNodeHeight(node);
            if (node.children.length === 0) {
                node.subtreeHeight = myHeight;
                return;
            }
            let totalChildrenHeight = 0;
            node.children.forEach(child => {
                computeHeights(child);
                totalChildrenHeight += child.subtreeHeight;
            });
            totalChildrenHeight += (node.children.length - 1) * VERTICAL_GAP;
            node.subtreeHeight = Math.max(myHeight, totalChildrenHeight);
        };

        computeHeights(treeRoot);

        // 3. Assign Coordinates (LTR: Negative X)
        const flatNodes: CanvasNode[] = [];
        const flatLinks: {source: string, target: string}[] = [];

        const assignCoordinates = (node: VisualTreeNode, startY: number, level: number) => {
            if (node.id !== 'VIRTUAL_ROOT' && node.isVisible !== false) {
                const myHeight = estimateNodeHeight(node);
                node.x = -(level * LEVEL_SPACING);
                node.y = startY + (node.subtreeHeight / 2) - (myHeight / 2);
                flatNodes.push(node);
            }

            let childrenStackHeight = 0;
            node.children.forEach((child, i) => {
            childrenStackHeight += child.subtreeHeight;
            if (i < node.children.length - 1) childrenStackHeight += VERTICAL_GAP;
            });

            let currentChildY = startY + (node.subtreeHeight - childrenStackHeight) / 2;

            node.children.forEach(child => {
                if (node.id !== 'VIRTUAL_ROOT' && node.isVisible !== false) {
                    flatLinks.push({ source: child.visualId, target: node.visualId });
                }
                assignCoordinates(child, currentChildY, level + 1);
                currentChildY += child.subtreeHeight + VERTICAL_GAP;
            });
        };

        const totalRootHeight = treeRoot.subtreeHeight;
        const startY = -(totalRootHeight / 2);
        
        assignCoordinates(treeRoot, startY, 0); 
        
        setLayoutNodes(flatNodes);
        setLayoutLinks([...flatLinks, ...extraLinks]);

    }, [visibleNodeIds, fullNodeMap, templateRootId, entryFile]);

    // --- Compute Component Groups ---
    useEffect(() => {
        if (layoutNodes.length === 0) {
            setComponentGroups([]);
            return;
        }

        const groups: Record<string, CanvasNode[]> = {};
        layoutNodes.forEach(node => {
            if (!groups[node.filePath]) groups[node.filePath] = [];
            groups[node.filePath].push(node);
        });

        const calculatedGroups: ComponentGroup[] = Object.entries(groups).map(([filePath, nodes]) => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            
            nodes.forEach(n => {
                const h = estimateNodeHeight(n);
                const w = n.type === 'template' ? 900 : 550; 
                
                if (n.x < minX) minX = n.x;
                if (n.x + w > maxX) maxX = n.x + w;
                if (n.y < minY) minY = n.y;
                if (n.y + h > maxY) maxY = n.y + h;
            });

            return {
                filePath,
                minX: minX - 40, 
                maxX: maxX + 40,
                minY: minY - 60, 
                maxY: maxY + 40,
                label: filePath.split('/').pop() || 'Unknown Component'
            };
        });

        setComponentGroups(calculatedGroups);
    }, [layoutNodes]);

    // --- Sync atoms with layout data ---
    useEffect(() => {
        setLayoutNodesAtom(layoutNodes);
        setFullNodeMapAtom(fullNodeMap);
        setEntryFileAtom(entryFile);
        setTemplateRootIdAtom(templateRootId);
    }, [layoutNodes, fullNodeMap, entryFile, templateRootId, setLayoutNodesAtom, setFullNodeMapAtom, setEntryFileAtom, setTemplateRootIdAtom]);

    // --- Initialize visible IDs ---
    useEffect(() => {
        const initialSet = new Set<string>();
        if (templateRootId) {
            initialSet.add(templateRootId);
        }
        initialData.nodes.forEach(n => {
            if (n.type === 'call' && n.filePath === entryFile) {
                initialSet.add(n.id);
            }
        });
        setVisibleNodeIdsAtom(initialSet);
    }, [initialData, templateRootId, entryFile, setVisibleNodeIdsAtom]);

    return {
        layoutNodes,
        layoutLinks,
        componentGroups,
        fullNodeMap,
        templateRootId
    };
};