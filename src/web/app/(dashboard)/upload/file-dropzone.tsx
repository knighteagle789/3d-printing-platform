'use client';

import { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.3mf', '.step', '.iges', '.gcode'];
const MAX_SIZE_MB = 250;

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading:  boolean;
}

export function FileDropzone({ onFileSelect, isUploading }: FileDropzoneProps) {
  const [dragOver,     setDragOver]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateAndSelect = useCallback((file: File) => {
    setError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setError(`File too large — maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, [validateAndSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  // ── File selected ──
  if (selectedFile) {
    return (
      <div className="border border-accent/20 bg-accent-light">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <File className="h-4 w-4 text-accent/60 shrink-0" />
            <div>
              <p className={`${mono.className} text-[11px] text-text-primary`}>
                {selectedFile.name}
              </p>
              <p className={`${mono.className} text-[9px] text-text-muted mt-0.5`}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={clearFile}
              className="text-text-muted hover:text-danger transition-colors p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isUploading && (
          <div className="px-4 pb-3">
            <div className="h-[2px] w-full bg-border overflow-hidden">
              <div className="h-full bg-accent/60 animate-pulse w-3/4 transition-all" />
            </div>
            <p className={`${mono.className} text-[9px] text-accent/50 mt-1.5 animate-pulse`}>
              Uploading...
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Empty drop zone ──
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`
          border-2 border-dashed p-14 text-center cursor-pointer transition-colors
          ${dragOver
            ? 'border-accent/50 bg-accent-light'
            : 'border-border hover:border-border-strong hover:bg-surface-alt'
          }
        `}
      >
        <Upload className={`h-8 w-8 mx-auto mb-4 ${dragOver ? 'text-accent/60' : 'text-text-muted'}`} />
        <p className={`${mono.className} text-[11px] text-text-secondary mb-1`}>
          Drag and drop your 3D model here
        </p>
        <p className={`${mono.className} text-[10px] text-text-muted mb-4`}>
          or click to browse
        </p>
        <p className={`${mono.className} text-[9px] text-text-muted`}>
          {ALLOWED_EXTENSIONS.join('  ·  ')} &nbsp;·&nbsp; Max {MAX_SIZE_MB} MB
        </p>
      </div>

      <input
        id="file-input"
        type="file"
        className="hidden"
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleFileInput}
      />

      {error && (
        <p className={`${mono.className} text-[10px] text-red-400 mt-2`}>{error}</p>
      )}
    </div>
  );
}