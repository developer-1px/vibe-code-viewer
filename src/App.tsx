import React, { useMemo, useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import Sidebar from './components/Sidebar.tsx';
import PipelineCanvas from './widgets/PipelineCanvas.tsx';
import { parseVueCode } from './services/codeParser.ts';
import { Box, AlertCircle, PanelLeft } from 'lucide-react';
import { filesAtom, entryFileAtom, isSidebarOpenAtom } from './store/atoms';

const App: React.FC = () => {
  const [files] = useAtom(filesAtom);
  const [entryFile] = useAtom(entryFileAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const [parseError, setParseError] = useState<string | null>(null);

  // Toggle Sidebar Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Parse project on file change
  const graphData = useMemo(() => {
    try {
      const data = parseVueCode(files, entryFile);
      setParseError(null);
      return data;
    } catch (e: any) {
      console.warn("Project Parse Error:", e);
      setParseError(e.message || "Syntax Error");
      return null;
    }
  }, [files, entryFile]);

  const [lastValidData, setLastValidData] = useState(graphData);
  if (graphData && graphData !== lastValidData) {
    setLastValidData(graphData);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vibe-dark text-slate-200 font-sans">
      {/* Left Sidebar - Code Input */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative z-50 ${isSidebarOpen ? 'w-[400px]' : 'w-0'}`}
      >
        <div className="w-[400px] h-full">
          <Sidebar />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">

        {/* Minimal Header */}
        <header className="h-14 bg-vibe-panel/50 backdrop-blur border-b border-vibe-border flex items-center px-6 justify-between relative z-0 transition-all duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors ${!isSidebarOpen ? 'text-vibe-accent bg-vibe-accent/10' : ''}`}
              title="Toggle Sidebar (Cmd/Ctrl + \)"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <Box className="w-4 h-4 text-vibe-purple" />
              <span className="text-slate-500 font-normal">Logic Visualization</span>
            </h2>
          </div>

          <div className="flex gap-2 items-center text-xs">
            {parseError ? (
              <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Syntax Error
              </span>
            ) : (
              <span className="px-2 py-1 bg-vibe-accent/10 text-vibe-accent rounded border border-vibe-accent/20">
                Project Analysis Active
              </span>
            )}
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {lastValidData && <PipelineCanvas initialData={lastValidData} entryFile={entryFile} />}
        </div>
      </div>
    </div>
  );
};

export default App;
