import React, { useEffect, useRef, useState } from 'react';
import { DocData, BlockType, SymbolDetail } from '../model/types';
// We rely on the global `hljs` from CDN being available
declare const hljs: any;
declare const mermaid: any;

interface DocViewerProps {
  data: DocData;
  layout: 'linear' | 'split';
}

const getStartLine = (lineStr?: string): number => {
  if (!lineStr) return 1;
  const match = lineStr.match(/L?(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

// --- Minimal Icons Component ---
const Icon = ({ name, className = "w-4 h-4" }: { name: string, className?: string }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    package: <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
    layers: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    function: <><path d="M19 3v18H5V3h14z" /><path d="M9 15l3-3 3 3" /><path d="M12 9v6" /></>,
    interface: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>,
    class: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
    branch: <><path d="M6 3v12" strokeDasharray="4 4" /><circle cx="6" cy="18" r="3" /><path d="M9 18h9l-3-3m3 3l-3 3" /></>,
    tag: <><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></>,
    info: <circle cx="12" cy="12" r="10" />,
    arrowDown: <path d="m6 9 6 6 6-6"/>,
    arrowUp: <path d="m18 15-6-6-6 6"/>,
    flow: <path d="M22 7M2 7l10-5 10 5-10 5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  };
  
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {paths[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

// --- Rich Text Parser Component ---
const RichText: React.FC<{ content: string, className?: string }> = ({ content, className = "" }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
       const ListTag = listType === 'ol' ? 'ol' : 'ul';
       // We use a unique key for the list wrapper based on the elements length
       elements.push(
         <ListTag key={`list-${elements.length}`} className={`pl-5 mb-4 space-y-1 ${listType === 'ol' ? 'list-decimal' : 'list-disc'} marker:text-gray-300 text-gray-700`}>
           {currentList}
         </ListTag>
       );
       currentList = [];
       listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
        flushList();
        return; 
    }

    // Detect Bullets: "- " or "* "
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    // Detect Numbers: "1. " or "1) "
    const numberMatch = line.match(/^\s*\d+[\.)]\s+(.*)/);

    if (bulletMatch) {
        if (listType === 'ol') flushList(); // Close existing ordered list
        listType = 'ul';
        currentList.push(<li key={`li-${idx}`} className="pl-1 leading-relaxed">{bulletMatch[1]}</li>);
    } else if (numberMatch) {
        if (listType === 'ul') flushList(); // Close existing unordered list
        listType = 'ol';
        currentList.push(<li key={`li-${idx}`} className="pl-1 leading-relaxed">{numberMatch[1]}</li>);
    } else {
        flushList();
        // Detect "Header:" pattern (lines ending with colon, short length)
        if (trimmed.endsWith(':') && trimmed.length < 50) {
             elements.push(<div key={`p-${idx}`} className="font-sans font-bold text-xs text-gray-900 uppercase tracking-widest mt-6 mb-3">{trimmed}</div>);
        } else {
             // Standard paragraph
             elements.push(<p key={`p-${idx}`} className="mb-2 leading-8">{trimmed}</p>);
        }
    }
  });

  flushList();

  return <div className={className}>{elements}</div>;
};

// --- Code Block styled as a clean "Figure" ---
const TextbookCodeBlock: React.FC<{ 
  code: string, 
  lang?: string, 
  startLine?: number 
}> = ({ code, lang = 'typescript', startLine = 1 }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current && typeof hljs !== 'undefined') {
      codeRef.current.innerHTML = hljs.highlight(code, { language: lang }).value;
    }
  }, [code, lang]);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => startLine + i).join('\n');

  return (
    <div className="my-6 bg-gray-50 rounded-md overflow-hidden group border border-gray-100/50">
      <div className="flex leading-7 py-3">
        <div className="flex-none w-10 text-right pr-3 text-gray-300 select-none group-hover:text-gray-400 transition-colors">
             <pre className="font-mono text-[10px] leading-7 pt-0.5">{lineNumbers}</pre>
        </div>
        <div className="flex-1 overflow-x-auto custom-scrollbar pl-4 pr-4">
           <pre className="font-mono leading-7 text-gray-800 m-0 text-[13px]">
             <code ref={codeRef} className={`language-${lang} bg-transparent p-0 block`}>
               {code}
             </code>
           </pre>
        </div>
      </div>
    </div>
  );
};

// --- Mermaid Diagram Component ---
const MermaidDiagram: React.FC<{ chart: string, id: string }> = ({ chart, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (typeof mermaid !== 'undefined' && chart) {
        try {
          mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'base',
            themeVariables: {
              primaryColor: '#eef2ff', // blue-50
              primaryTextColor: '#1e293b', // slate-800
              primaryBorderColor: '#cbd5e1', // slate-300
              lineColor: '#64748b', // slate-500
              secondaryColor: '#f8fafc',
              tertiaryColor: '#fff',
            },
            fontFamily: 'Inter'
          });
          // Render Mermaid content to a specific ID
          const { svg } = await mermaid.render(`mermaid-${id}`, chart);
          setSvg(svg);
        } catch (error) {
          console.error("Mermaid failed to render", error);
        }
      }
    };
    renderChart();
  }, [chart, id]);

  if (!svg) return <div className="animate-pulse h-24 bg-gray-50 rounded-lg"></div>;

  return (
    <div 
      className="my-8 p-6 bg-white border border-gray-100 rounded-lg shadow-sm flex justify-center overflow-x-auto custom-scrollbar"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

// --- Breadcrumb Component ---
const Breadcrumb = ({ path, filename }: { path: string, filename: string }) => {
    // path might be "src/utils" or just "utils"
    const segments = path.split('/').filter(Boolean);
    
    return (
        <nav className="flex items-center gap-2 text-[11px] font-sans font-medium text-gray-400 tracking-wider mb-8">
            <div className="flex items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                <Icon name="home" className="w-3 h-3" />
                <span>Home</span>
            </div>
            {segments.map((seg, i) => (
                <React.Fragment key={i}>
                    <Icon name="chevronRight" className="w-3 h-3 text-gray-300" />
                    <span className="hover:text-gray-600 cursor-pointer transition-colors">{seg}</span>
                </React.Fragment>
            ))}
            <Icon name="chevronRight" className="w-3 h-3 text-gray-300" />
            <span className="text-gray-900 font-bold">{filename}</span>
        </nav>
    );
};

// --- Symbol Section ---
const SymbolSection: React.FC<{ symbol: SymbolDetail, layout: 'linear' | 'split' }> = ({ symbol, layout }) => {
  let TypeIcon = "info";
  if (symbol.type === 'function') TypeIcon = "function";
  if (symbol.type === 'interface') TypeIcon = "interface";
  if (symbol.type === 'class') TypeIcon = "class";

  return (
    <section 
        id={symbol.name} 
        className={`mb-24 pb-16 border-b border-gray-100 last:border-0 ${layout === 'split' ? 'grid grid-cols-12 gap-16' : ''}`}
    >
      
      {/* LEFT COLUMN (Prose & Specs) */}
      <div className={`${layout === 'split' ? 'col-span-5' : ''}`}>
        
        {/* Header / Definition */}
        <div className="mb-8">
           <div className="mb-2">
              <span className="font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest">{symbol.type}</span>
           </div>
           
           <h3 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 break-all leading-snug flex items-center gap-4">
             <div className="flex-none p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
                <Icon name={TypeIcon} className="w-6 h-6 stroke-1" />
             </div>
             <span>{symbol.name}</span>
           </h3>
           
           {/* Brief Signature Display - Minimalist */}
           <div className="font-mono text-xs text-gray-500 mb-6 break-words bg-white border-l-2 border-gray-100 pl-3 py-1">
              {symbol.signature}
           </div>
        </div>

        {/* Flowchart Visualization (New) */}
        {symbol.flowchart && (
          <div className="mb-10">
            <span className="block font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Icon name="flow" className="w-3 h-3" />
              Logic Flow
            </span>
            <MermaidDiagram chart={symbol.flowchart} id={`flow-${symbol.name}`} />
          </div>
        )}

        {/* Description Prose - Parsed with RichText */}
        <div className="prose-textbook text-gray-800 text-lg leading-8 mb-10">
          <RichText content={symbol.description} />
        </div>

        {/* Technical Specifications (Params/Returns) - Minimalist List */}
        {((symbol.parameters?.length || 0) > 0 || symbol.returns) && (
            <div className="mb-10 pt-6 border-t border-gray-100">
                {symbol.parameters && symbol.parameters.length > 0 && (
                    <div className="mb-6">
                        <span className="block font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Inputs</span>
                        <ul className="space-y-4">
                            {symbol.parameters.map((p, i) => (
                                <li key={i} className="text-sm group">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{p.name}</span>
                                        <span className="font-mono text-[10px] text-gray-400">{p.type}</span>
                                    </div>
                                    <div className="font-serif text-gray-600 italic mt-1.5 leading-relaxed">
                                        <RichText content={p.description} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {symbol.returns && symbol.returns !== 'void' && (
                    <div className="mt-6">
                        <span className="block font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Returns</span>
                        <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                            {symbol.returns}
                        </span>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* RIGHT COLUMN (Implementation Logic) */}
      <div className={`${layout === 'split' ? 'col-span-7 pt-2' : ''}`}>
        
        {symbol.blocks?.length > 0 ? (
          <div className="space-y-6">
            {symbol.blocks.map((block, idx) => {
              
              // 1. Prose Blocks embedded in code (Narrative) - Parsed with RichText
              if (block.type === BlockType.PROSE) {
                return (
                  <div key={idx} className="font-serif text-gray-700 text-lg leading-8 my-6 pl-3 border-l-2 border-gray-200/60">
                    <RichText content={block.content} />
                  </div>
                );
              }

              // 2. Callout Tags (NOTE, WARNING, SECURITY) - Parsed with RichText
              if (block.type === BlockType.TAG) {
                 const label = block.label || 'NOTE';
                 const isSecurity = label.toUpperCase().includes('SECURITY');
                 const isWarning = label.toUpperCase().includes('WARNING') || label.toUpperCase().includes('FIXME');
                 
                 let bgColor = 'bg-blue-50';
                 let textColor = 'text-blue-900';
                 let icon = 'info';

                 if (isSecurity) { bgColor = 'bg-indigo-50'; textColor = 'text-indigo-900'; icon = 'tag'; }
                 if (isWarning) { bgColor = 'bg-amber-50'; textColor = 'text-amber-900'; icon = 'tag'; }

                 return (
                    <div key={idx} className={`my-8 p-5 rounded-lg ${bgColor} ${textColor} flex gap-4`}>
                        <div className="flex-none pt-1 opacity-60">
                            <Icon name={icon} className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-sans text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">
                                {label}
                            </div>
                            <div className="font-serif text-lg italic leading-relaxed">
                                <RichText content={block.content} />
                            </div>
                        </div>
                    </div>
                 )
              }

              // 3. Logic Flow / Branches - Parsed with RichText
              if (block.type === BlockType.BRANCH) {
                  return (
                      <div key={idx} className="mt-8 mb-4 pl-2 flex gap-4 items-start group">
                          <div className="flex-none pt-1">
                             <div className="text-gray-300 group-hover:text-indigo-500 transition-colors">
                                <Icon name="branch" className="w-5 h-5" />
                             </div>
                          </div>
                          <div>
                            <div className="font-sans text-xs font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider mb-1 transition-colors">
                                {block.label || 'Branch'}
                            </div>
                            <div className="font-serif text-gray-800 font-medium text-lg">
                                <RichText content={block.content} />
                            </div>
                          </div>
                      </div>
                  )
              }

              // 4. Code Blocks
              if (block.type === BlockType.CODE) {
                const startLine = getStartLine(block.lines);
                return (
                  <div key={idx}>
                    <TextbookCodeBlock 
                        code={block.content} 
                        startLine={startLine}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : (
            <div className="bg-gray-50 p-12 text-center text-gray-400 font-serif italic rounded-lg">
                Implementation details are hidden or not available.
            </div>
        )}
      </div>

    </section>
  );
};

// --- Main Viewer Component ---
export const DocViewer: React.FC<DocViewerProps> = ({ data, layout }) => {
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);
  const importsCount = data.imports?.length || 0;
  const VISIBLE_IMPORTS = 8;
  const visibleImports = isDepsExpanded ? data.imports : data.imports.slice(0, VISIBLE_IMPORTS);

  return (
    <div className={`mx-auto ${layout === 'split' ? 'px-16 py-12 bg-white' : ''}`}>
      
      {/* 1. Breadcrumb */}
      <Breadcrumb path={data.meta.path} filename={data.meta.filename} />

      {/* 2. Document Header */}
      <header className="mb-24 mt-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-8 tracking-tight leading-snug">
          {data.meta.filename}
        </h1>
        
        {/* Parsed with RichText for file description */}
        <div className="max-w-3xl font-serif text-xl md:text-2xl text-gray-600 leading-relaxed italic pl-6 border-l-4 border-gray-900 py-2 mb-10">
          <RichText content={data.meta.description || "No description provided."} />
        </div>
        
        {/* Meta Grid */}
        <div className="flex flex-wrap gap-x-12 gap-y-6 font-sans text-xs text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-6">
             <div>
                <span className="block text-[10px] text-gray-400 mb-1">Author</span>
                <span className="text-gray-900 font-bold">{data.meta.author || "Unknown"}</span>
             </div>
             <div>
                <span className="block text-[10px] text-gray-400 mb-1">Version</span>
                <span className="text-gray-900 font-bold">{data.meta.version || "1.0.0"}</span>
             </div>
             <div>
                <span className="block text-[10px] text-gray-400 mb-1">Last Modified</span>
                <span className="text-gray-900 font-bold">{data.meta.lastModified || new Date().toLocaleDateString()}</span>
             </div>
        </div>
      </header>

      {/* 3. Dependencies (Compact) */}
      {data.imports && data.imports.length > 0 && (
        <section className="mb-24">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
                <Icon name="package" className="w-3 h-3 text-gray-400" />
                Dependencies <span className="text-gray-300 font-light">|</span> <span className="text-gray-400 font-normal">{importsCount} modules</span>
            </h3>
            
            <div className="flex flex-wrap gap-2 items-center">
                {visibleImports.map((imp, i) => (
                    <div 
                        key={i} 
                        title={imp.path} // Show full path on hover
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                    >
                        <Icon name="package" className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="font-mono text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{imp.name}</span>
                    </div>
                ))}
                
                {importsCount > VISIBLE_IMPORTS && (
                    <button 
                        onClick={() => setIsDepsExpanded(!isDepsExpanded)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        {isDepsExpanded ? (
                            <>Show Less <Icon name="arrowUp" className="w-3 h-3" /></>
                        ) : (
                            <>+{importsCount - VISIBLE_IMPORTS} more <Icon name="arrowDown" className="w-3 h-3" /></>
                        )}
                    </button>
                )}
            </div>
        </section>
      )}

      {/* 4. Main Content (Symbols) */}
      <div className="mb-32">
        {data.symbols?.map((symbol, idx) => (
             <SymbolSection key={idx} symbol={symbol} layout={layout} />
        ))}
      </div>
      
      <footer className="pt-12 border-t border-gray-100 flex justify-between items-center text-gray-400">
         <div className="font-serif italic text-sm">
            Generated by TSDoc GenAI
         </div>
         <div className="font-sans text-[10px] tracking-widest uppercase">
            {new Date().toLocaleDateString()}
         </div>
      </footer>
    </div>
  );
};

// --- Table of Contents Component (New) ---
export const TableOfContents = ({ symbols }: { symbols: SymbolDetail[] }) => {
  const scrollToSymbol = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-64 flex-none hidden xl:block pl-8">
      <div className="fixed w-56 pt-12">
        <h4 className="font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
          On This Page
        </h4>
        <ul className="space-y-3 relative border-l border-gray-200 ml-1">
          {symbols.map((s, i) => {
             let icon = 'info';
             if (s.type === 'function') icon = 'function';
             if (s.type === 'interface') icon = 'interface';
             if (s.type === 'class') icon = 'class';

             return (
              <li key={i} className="-ml-[1px] pl-4 border-l border-transparent hover:border-gray-400 transition-colors">
                <button 
                  onClick={() => scrollToSymbol(s.name)}
                  className="text-left group flex items-start gap-2 w-full"
                >
                  <span className="flex-none pt-0.5 text-gray-300 group-hover:text-gray-500 transition-colors">
                      <Icon name={icon} className="w-3 h-3" />
                  </span>
                  <span className="text-xs font-medium text-gray-500 group-hover:text-gray-900 transition-colors leading-snug break-all">
                    {s.name}
                  </span>
                </button>
              </li>
             )
          })}
        </ul>
      </div>
    </div>
  );
};