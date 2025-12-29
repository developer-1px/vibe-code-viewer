
import { useEffect, useState, useMemo } from 'react';
import { useSetAtom } from 'jotai';
import { GraphData, VariableNode } from '../../entities/VariableNode';
import { CanvasNode } from '../../entities/CanvasNode';
import { LEVEL_SPACING, VERTICAL_GAP, estimateNodeHeight, getUsageIndex, hasCycle } from './utils.ts';
import {
  layoutNodesAtom,
  layoutLinksAtom,
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

    // Atom setters
    const setLayoutNodesAtom = useSetAtom(layoutNodesAtom);
    const setLayoutLinksAtom = useSetAtom(layoutLinksAtom);
    const setFullNodeMapAtom = useSetAtom(fullNodeMapAtom);
    const setEntryFileAtom = useSetAtom(entryFileAtom);
    const setTemplateRootIdAtom = useSetAtom(templateRootIdAtom);
    const setVisibleNodeIdsAtom = useSetAtom(visibleNodeIdsAtom);

    const fullNodeMap = useMemo(() => {
        if (!initialData) return new Map<string, VariableNode>();
        const map = new Map<string, VariableNode>(initialData.nodes.map(n => [n.id, n]));
        console.log(`📊 Full node map has ${map.size} nodes`);
        console.log(`🔑 Node IDs:`, Array.from(map.keys()).slice(0, 10));
        return map;
    }, [initialData]);

    // Template Root ID (파일 자체를 Root로 사용)
    const templateRootId = useMemo(() => {
        console.log(`🎯 Looking for entry file: ${entryFile}`);
        console.log(`🔍 Has entry file in map?`, fullNodeMap.has(entryFile));

        // 파일 경로를 직접 사용
        if (fullNodeMap.has(entryFile)) return entryFile;

        // Entry file의 App 컴포넌트 찾기
        const appNode = Array.from(fullNodeMap.values()).find(n =>
            n.filePath === entryFile && n.label === 'App'
        );
        if (appNode) {
            console.log(`✅ Found App component:`, appNode.id);
            return appNode.id;
        }

        console.log(`❌ No template root found`);
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

        // Helper to determine sort weight
        // Order: Imports (non-component) -> Local Logic -> Functions -> Components/Templates
        const getNodeWeight = (node: VariableNode) => {
            switch (node.type) {
                case 'ref': return 1;
                case 'computed': return 2;
                case 'store': return 3;
                case 'hook': return 4;
                case 'call': return 5;
                case 'function': return 10;
                case 'template': return 30; // Templates always at the bottom
                default: return 15;
            }
        };

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
                const nodeA = layoutNodeMap.get(a);
                const nodeB = layoutNodeMap.get(b);
                
                // 1. Sort by Weighted Category
                // (Imports -> Variables -> Functions -> Components)
                const weightA = nodeA ? getNodeWeight(nodeA) : 99;
                const weightB = nodeB ? getNodeWeight(nodeB) : 99;
                
                if (weightA !== weightB) {
                    return weightA - weightB;
                }

                // 2. Sort by Usage Position in Parent Code (Keep relevant logic flow)
                const indexA = getUsageIndex(raw.codeSnippet, a);
                const indexB = getUsageIndex(raw.codeSnippet, b);
                if (indexA !== indexB) return indexA - indexB;

                // 3. Fallback to definition line
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

        // Add orphan nodes (visible but not in tree)
        const orphanNodes: CanvasNode[] = [];
        let orphanY = startY;

        visibleNodeIds.forEach(nodeId => {
            if (!visited.has(nodeId)) {
                const node = fullNodeMap.get(nodeId);
                if (node && node.codeSnippet && node.codeSnippet.trim() !== '') {
                    const height = estimateNodeHeight(node);
                    orphanNodes.push({
                        ...node,
                        level: 0,
                        x: LEVEL_SPACING, // Place to the right
                        y: orphanY,
                        isVisible: true,
                        visualId: nodeId,
                    });
                    orphanY += height + VERTICAL_GAP;
                    visited.add(nodeId);
                }
            }
        });

        setLayoutNodes([...flatNodes, ...orphanNodes]);
        setLayoutLinks([...flatLinks, ...extraLinks]);

    }, [visibleNodeIds, fullNodeMap, templateRootId, entryFile]);

    // --- Sync atoms with layout data ---
    useEffect(() => {
        setLayoutNodesAtom(layoutNodes);
        setLayoutLinksAtom(layoutLinks);
        setFullNodeMapAtom(fullNodeMap);
        setEntryFileAtom(entryFile);
        setTemplateRootIdAtom(templateRootId);
    }, [layoutNodes, layoutLinks, fullNodeMap, entryFile, templateRootId, setLayoutNodesAtom, setLayoutLinksAtom, setFullNodeMapAtom, setEntryFileAtom, setTemplateRootIdAtom]);

    // --- Initialize visible IDs ---
    useEffect(() => {
        if (!initialData) return; // FIX: Ensure initialData exists

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
        fullNodeMap,
        templateRootId
    };
};
