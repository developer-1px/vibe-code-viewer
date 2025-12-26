import React, { useMemo } from 'react';
import { CanvasNode } from '../types';
import { Terminal, Box, FunctionSquare, LayoutTemplate, Database, Link2 } from 'lucide-react';
import { parse } from '@babel/parser';

interface CodeCardProps {
  node: CanvasNode;
  onTokenClick: (token: string, sourceNodeId: string) => void;
  activeDependencies: string[];
  allKnownIds: string[];
}

// Helper: Text range for highlighting
interface TokenRange {
  start: number;
  end: number;
  type: 'self' | 'dependency' | 'other-known' | 'text';
  text: string;
}

const CodeCard: React.FC<CodeCardProps> = ({ node, onTokenClick, activeDependencies, allKnownIds }) => {

  const isTemplate = node.type === 'template';

  // --- 1. AST Based Tokenizer (Memoized) ---
  const tokenRanges = useMemo(() => {
    // For Template (HTML), we skip JS AST parsing and use a simpler fallback or just return text.
    // Since 'allKnownIds' logic in template is complex (interpolations), 
    // we will stick to a simpler regex for Template ONLY, but use robust AST for Script.
    if (isTemplate) return [];

    const ranges: TokenRange[] = [];
    
    try {
        // Parse the snippet (It's usually a Statement, e.g., const x = ...)
        const ast = parse(node.codeSnippet, {
            sourceType: 'module',
            plugins: ['typescript']
        });

        // Simple AST Walker
        const visit = (n: any, parent: any) => {
            if (!n || typeof n !== 'object') return;

            // Check Identifier
            if (n.type === 'Identifier') {
                const name = n.name;
                const isKnown = allKnownIds.includes(name);

                if (isKnown) {
                    let type: TokenRange['type'] = 'text';
                    let isValidRef = true;

                    // --- Context Checks (Is this actually a variable usage?) ---
                    
                    // 1. Property Key in Object Literal: { key: value } -> 'key' is NOT a ref (unless computed)
                    if (parent?.type === 'ObjectProperty' && parent.key === n && !parent.computed) {
                        // Exception: If we are destructuring: const { data: myData } = ...
                        // If 'n' is the 'key' (data), it's not the var. The value (myData) is.
                        // However, if Shorthand: const { data } = ... -> data is both key and value.
                        if (parent.shorthand) {
                            isValidRef = true;
                        } else {
                            isValidRef = false;
                        }
                    }

                    // 2. Member Expression Property: obj.prop -> 'prop' is NOT a ref
                    if ((parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') && 
                        parent.property === n && !parent.computed) {
                        isValidRef = false;
                    }

                    // 3. Object Method Key: { method() {} }
                    if (parent?.type === 'ObjectMethod' && parent.key === n && !parent.computed) {
                         isValidRef = false;
                    }

                    // --- Determination ---
                    if (isValidRef) {
                        if (name === node.id) {
                            // If it's the definition of THIS node
                            // We assume strict equality. 
                            // Note: In a large snippet, "self" might appear multiple times.
                            // We highlight all occurrences of self as "self".
                            type = 'self';
                        } else if (node.dependencies.includes(name)) {
                            type = 'dependency';
                        } else {
                            // It's a known ID but not a direct dependency? 
                            // Could be a global or just another var in the system.
                            type = 'other-known';
                        }

                        ranges.push({
                            start: n.start,
                            end: n.end,
                            text: name,
                            type
                        });
                    }
                }
            }

            // Recurse
            Object.keys(n).forEach(key => {
                if (['loc', 'start', 'end', 'comments', 'extra', 'type'].includes(key)) return;
                const child = n[key];
                if (Array.isArray(child)) {
                    child.forEach(c => visit(c, n));
                } else if (child && typeof child === 'object') {
                    visit(child, n);
                }
            });
        };

        visit(ast.program, null);

    } catch (e) {
        // Fallback or silent fail if snippet is not valid JS statement
        console.warn("AST Tokenizer failed for card:", node.label, e);
    }

    // Deduplicate ranges (Fix for Shorthand Properties visiting both key and value at same location)
    const uniqueRanges: TokenRange[] = [];
    const seenStarts = new Set<number>();
    
    ranges.sort((a, b) => a.start - b.start).forEach(range => {
        if (!seenStarts.has(range.start)) {
            uniqueRanges.push(range);
            seenStarts.add(range.start);
        }
    });

    return uniqueRanges;
  }, [node.codeSnippet, node.id, node.dependencies, allKnownIds, isTemplate]);


  // --- 2. Line Renderer ---
  const { lines } = useMemo(() => {
    const rawLines = node.codeSnippet.split('\n');
    const startLineNum = node.startLine || 1;
    let currentGlobalIndex = 0; // Tracks the start index of the current line in the full snippet

    // --- Regex Fallback for Template (HTML) ---
    if (isTemplate) {
        // Sort IDs by length desc to ensure we match "$t" before "$" if both exist (rare but safer)
        const sortedIds = [...allKnownIds].sort((a, b) => b.length - a.length);
        const escapedIds = sortedIds.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        
        // Use lookbehind/lookahead to handle variables starting with $ correctly (e.g. $t)
        // \b does not work for $t because $ is not a word char.
        // Pattern: Not preceded by word/$, matches ID, not followed by word/$
        const pattern = new RegExp(`(?<![a-zA-Z0-9_$])(${escapedIds.join('|')})(?![a-zA-Z0-9_$])`, 'g');

        return {
             lines: rawLines.map((line, idx) => {
                const currentLineNum = startLineNum + idx;
                
                // Split by the regex
                const parts = line.split(pattern);
                
                return {
                    num: currentLineNum,
                    content: (
                        <span>
                            {parts.map((part, i) => {
                                if (allKnownIds.includes(part)) {
                                    const isSelf = part === node.id;
                                    const isActive = activeDependencies.includes(part);
                                    return (
                                        <span 
                                            key={i}
                                            data-token={part}
                                            className={`
                                                inline-block px-1 rounded cursor-pointer border transition-colors duration-200
                                                ${isActive 
                                                    ? 'bg-vibe-accent/20 border-vibe-accent text-vibe-accent' 
                                                    : 'bg-slate-800/50 border-slate-700 text-pink-300 hover:bg-white/10 hover:border-vibe-accent/50'
                                                }
                                            `}
                                            onClick={(e) => { e.stopPropagation(); onTokenClick(part, node.id); }}
                                        >
                                            {part}
                                        </span>
                                    )
                                }
                                return <span key={i} className="text-slate-400">{part}</span>;
                            })}
                        </span>
                    ),
                    hasInput: parts.some(p => allKnownIds.includes(p) && p !== node.id)
                };
             }),
             startLine: startLineNum
        };
    }

    // --- AST Based Renderer for Script ---
    const processedLines = rawLines.map((lineContent, lineIdx) => {
        const lineStartIdx = currentGlobalIndex;
        const lineEndIdx = lineStartIdx + lineContent.length;
        const currentLineNum = startLineNum + lineIdx;
        
        // Update global index for next loop (+1 for newline char)
        currentGlobalIndex = lineEndIdx + 1;

        // Find tokens that overlap with this line
        const lineTokens = tokenRanges.filter(t => 
            t.start >= lineStartIdx && t.start < lineEndIdx
        );

        let hasInputDeps = false;
        const elements: React.ReactNode[] = [];
        let cursor = lineStartIdx;

        lineTokens.forEach((token, tIdx) => {
            // 1. Push text before token
            if (token.start > cursor) {
                const textPart = node.codeSnippet.slice(cursor, token.start);
                elements.push(<span key={`text-${tIdx}`} className="text-slate-300">{textPart}</span>);
            }

            // 2. Push Token
            const isSelf = token.type === 'self';
            const isActive = activeDependencies.includes(token.text);
            
            if (token.type === 'dependency') hasInputDeps = true;

            if (isSelf) {
                 elements.push(
                    <span key={`tok-${tIdx}`} className="text-vibe-accent font-bold" data-token={token.text}>
                        {token.text}
                    </span>
                 );
            } else if (token.type === 'dependency' || token.type === 'other-known') {
                elements.push(
                    <span 
                        key={`tok-${tIdx}`}
                        data-token={token.text}
                        className={`
                            inline-block px-0.5 rounded cursor-pointer transition-all duration-200 
                            border 
                            ${isActive 
                                ? 'bg-vibe-accent/20 border-vibe-accent text-vibe-accent shadow-[0_0_8px_rgba(56,189,248,0.4)]' 
                                : 'bg-slate-800/50 border-slate-700 text-blue-300 hover:bg-white/10 hover:border-vibe-accent/50'
                            }
                        `}
                        onClick={(e) => {
                            e.stopPropagation();
                            onTokenClick(token.text, node.id);
                        }}
                    >
                        {token.text}
                    </span>
                );
            } else {
                elements.push(<span key={`tok-${tIdx}`} className="text-slate-300">{token.text}</span>);
            }

            cursor = token.end;
        });

        // 3. Push remaining text
        if (cursor < lineEndIdx) {
            const tail = node.codeSnippet.slice(cursor, lineEndIdx);
            elements.push(<span key="tail" className="text-slate-300">{tail}</span>);
        }

        return {
            num: currentLineNum,
            content: <span className="block min-h-[1.25rem]">{elements.length ? elements : <span className="text-slate-500 opacity-50">{lineContent}</span>}</span>,
            hasInput: hasInputDeps
        };
    });

    return { lines: processedLines, startLine: startLineNum };

  }, [node.codeSnippet, node.startLine, tokenRanges, isTemplate, activeDependencies, onTokenClick, allKnownIds, node.id]);


  // --- Styles & Icons (unchanged) ---
  const getIcon = () => {
    switch (node.type) {
      case 'template': return <LayoutTemplate className="w-4 h-4 text-pink-400" />;
      case 'computed': return <FunctionSquare className="w-4 h-4 text-vibe-accent" />;
      case 'ref': return <Database className="w-4 h-4 text-emerald-400" />;
      case 'function': return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'hook': return <Link2 className="w-4 h-4 text-violet-400" />;
      default: return <Box className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBorderColor = () => {
     switch (node.type) {
      case 'template': return 'border-pink-500/50 shadow-pink-900/20';
      case 'computed': return 'border-vibe-accent/50 shadow-blue-900/20';
      case 'ref': return 'border-emerald-500/50 shadow-emerald-900/20';
      default: return 'border-vibe-border shadow-black/20';
    }
  };

  return (
    <div 
      id={`node-${node.visualId || node.id}`} 
      className={`
        bg-vibe-panel/95 backdrop-blur-md border shadow-2xl rounded-lg flex flex-col relative group overflow-visible transition-colors
        ${getBorderColor()}
        ${isTemplate ? 'min-w-[600px] max-w-[1000px] w-fit cursor-default' : 'min-w-[420px] max-w-[850px] w-fit cursor-default'}
      `}
    >
      {/* Header */}
      <div className={`px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20`}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-bold text-xs text-slate-100">{node.label}</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            {node.type}
        </span>
      </div>

      {/* Body */}
      <div className="flex bg-[#0b1221] rounded-b-lg">
        {/* Line Numbers & Slots */}
        <div className="flex-none w-16 py-2 bg-[#0f172a] border-r border-white/5 flex flex-col items-end px-3 text-xs font-mono text-slate-600 select-none relative z-10">
            {lines.map((line, i) => (
                <div key={i} className="leading-5 h-[1.25rem] relative flex items-center w-full justify-end group/line">
                     {line.hasInput && (
                        <div 
                            className="w-2 h-2 rounded-full absolute left-1 top-1/2 -translate-y-1/2 transition-all duration-300 bg-slate-700 border border-slate-600 group-hover/line:border-slate-500"
                            data-slot-line={line.num}
                        />
                     )}
                    <span className="mr-1">{line.num}</span>
                </div>
            ))}
        </div>
        
        {/* Code Content */}
        <div className="flex-1 py-2 px-3 overflow-x-auto relative scrollbar-hide">
            <pre className="font-mono text-xs leading-5 whitespace-pre">
                <code>
                    {lines.map((line, i) => {
                        const isDefinitionLine = line.num === node.startLine;
                        return (
                            <div 
                                key={i} 
                                className={`
                                    code-line h-[1.25rem] relative
                                    ${isDefinitionLine && !isTemplate ? 'bg-vibe-accent/5 -mx-3 px-3' : ''}
                                `} 
                                data-line-num={line.num}
                            >
                                {line.content}
                                {isDefinitionLine && !isTemplate && (
                                    <div 
                                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-500 translate-x-[50%]" 
                                        data-output-port={node.id}
                                    />
                                )}
                            </div>
                        );
                    })}
                </code>
            </pre>
        </div>
      </div>

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/5 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
};

export default CodeCard;