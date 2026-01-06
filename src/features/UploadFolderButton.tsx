import { useSetAtom } from 'jotai';
import { Upload as IconUpload } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';
import { activeTabAtom, openedTabsAtom } from '@/features/File/OpenFiles/model/atoms';
import { filesAtom } from '../app/model/atoms';

const UploadFolderButton: React.FC = () => {
  const setFiles = useSetAtom(filesAtom);
  const setOpenedTabs = useSetAtom(openedTabsAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const uploadedFiles: Record<string, string> = {};

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Only process .vue, .ts, .js files
      if (
        file.name.endsWith('.vue') ||
        file.name.endsWith('.tsx') ||
        file.name.endsWith('.jsx') ||
        file.name.endsWith('.ts') ||
        file.name.endsWith('.js')
      ) {
        try {
          const content = await file.text();
          // Use webkitRelativePath for folder structure
          const path = file.webkitRelativePath || file.name;
          uploadedFiles[path] = content;
        } catch (err) {
          console.error(`Error reading file ${file.name}:`, err);
        }
      }
    }

    if (Object.keys(uploadedFiles).length > 0) {
      setFiles(uploadedFiles);

      // Open the first file in IDE mode
      const allFiles = Object.keys(uploadedFiles);
      if (allFiles.length > 0) {
        const entry =
          allFiles.find((f) => f.includes('Index') || f.includes('index') || f.includes('App') || f.includes('main')) ||
          allFiles.find((f) => f.endsWith('.vue') || f.endsWith('.tsx') || f.endsWith('.jsx')) ||
          allFiles[0];
        setOpenedTabs([entry]);
        setActiveTab(entry);
      }
    } else {
      alert('No .vue, .ts, .js, .jsx, or .tsx files found in the selected folder.');
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="relative flex h-[var(--limn-activity-bar-icon)] w-[var(--limn-activity-bar-icon)] items-center justify-center rounded-md border border-transparent bg-transparent hover:bg-white/5 hover:border-border-light transition-all duration-normal"
        title="Upload Project Folder"
        aria-label="Upload Project Folder"
      >
        <IconUpload size={18} strokeWidth={1.5} className="text-text-muted transition-colors" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory is not in standard HTML types
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={handleFolderSelect}
      />
    </>
  );
};

export default UploadFolderButton;
