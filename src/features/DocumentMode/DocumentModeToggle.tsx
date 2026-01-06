/**
 * Document Mode Toggle
 * 다크/라이트 모드 전환 버튼
 */

import { useAtom } from 'jotai';
import { Moon, Sun } from 'lucide-react';
import { documentModeAtom } from '../../app/model/atoms';

export const DocumentModeToggle = () => {
  const [documentMode, setDocumentMode] = useAtom(documentModeAtom);

  const toggleMode = () => {
    setDocumentMode(documentMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleMode}
      className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-warm-active-hover transition-colors"
      title={`Switch to ${documentMode === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {documentMode === 'dark' ? (
        <Sun size={18} className="text-warm-300" />
      ) : (
        <Moon size={18} className="text-warm-500" />
      )}
    </button>
  );
};
