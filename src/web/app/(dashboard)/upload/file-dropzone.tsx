'use client';

import { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.3mf', '.step', '.iges', '.gcode'];
const MAX_SIZE_MB = 100;

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export function FileDropzone({ onFileSelect, isUploading }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateAndSelect = useCallback((file: File) => {
    setError(null);

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(`File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
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

  // File selected state
  if (selectedFile) {
    return (
      <div className="border-2 border-primary rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <File className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!isUploading && (
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isUploading && (
          <div className="mt-4">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
          </div>
        )}
      </div>
    );
  }

  // Dropzone state
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
          ${dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="font-medium mb-1">
          Drag and drop your 3D model here
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse your files
        </p>
        <p className="text-xs text-muted-foreground">
          Supported formats: {ALLOWED_EXTENSIONS.join(', ')} · Max {MAX_SIZE_MB}MB
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
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}