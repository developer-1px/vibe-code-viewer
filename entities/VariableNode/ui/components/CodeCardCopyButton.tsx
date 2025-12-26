import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeCardCopyButtonProps {
  codeSnippet: string;
}

const CodeCardCopyButton: React.FC<CodeCardCopyButtonProps> = ({ codeSnippet }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <button
      onClick={handleCopyCode}
      className="absolute bottom-2 right-2 p-1.5 rounded bg-slate-700/50 border border-slate-600/50 text-slate-400 opacity-0 group-hover/card:opacity-100 hover:bg-slate-600 hover:text-white hover:border-slate-500 transition-all duration-200 shadow-lg z-10"
      title="Copy code"
    >
      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

export default CodeCardCopyButton;
