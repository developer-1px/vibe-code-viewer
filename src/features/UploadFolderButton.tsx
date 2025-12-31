import React, { useRef } from 'react';
import { useSetAtom } from 'jotai';
import { Upload as IconUpload } from 'lucide-react';
import { filesAtom, activeFileAtom } from '../store/atoms';

const UploadFolderButton: React.FC = () => {
  const setFiles = useSetAtom(filesAtom);
  const setActiveFile = useSetAtom(activeFileAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const uploadedFiles: Record<string, string> = {};

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Only process .vue, .ts, .js files
      if (file.name.endsWith('.vue') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.ts') || file.name.endsWith('.js')) {
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

      // Set the first file as active
      const allFiles = Object.keys(uploadedFiles);
      if (allFiles.length > 0) {
        const entry = allFiles.find(f => f.includes('Index') || f.includes('index') || f.includes('App') || f.includes('main')) ||
                      allFiles.find(f => f.endsWith('.vue') || f.endsWith('.tsx') || f.endsWith('.jsx')) ||
                      allFiles[0];
        setActiveFile(entry);
      }
    } else {
      alert('No .vue, .ts, .js, .jsx, or .tsx files found in the selected folder.');
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-vibe-accent/10 text-vibe-accent hover:bg-vibe-accent/20 transition-colors"
        title="Upload Vue project folder"
      >
        <IconUpload className="w-3 h-3" />
        Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in standard HTML types
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={handleFolderSelect}
      />
    </>
  );
};

export default UploadFolderButton;
