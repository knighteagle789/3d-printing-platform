'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileBox, ImageIcon } from 'lucide-react';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import apiClient from '@/lib/api-client';
import { toProxiedUrl } from '@/lib/utils';

interface MediaUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  mode: 'image' | 'model' | 'video';
  optional?: boolean;
  error?: string;
}

export function MediaUploadField({
  label,
  value,
  onChange,
  mode,
  optional = false,
  error,
}: MediaUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = mode === 'image'
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : mode === 'video'
      ? 'video/mp4,video/webm'
    : '.stl,.obj,.3mf';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      if (mode === 'image') {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post<{ url: string }>('/Files/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.url);
      } else if (mode === 'video') {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post<{ url: string }>('/Files/upload-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.url);        
      } else {
        // For model files, use the existing upload endpoint
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post<{ storageUrl: string }>('/Files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.storageUrl);
      }
    } catch {
      setUploadError('Upload failed. Please try again or paste a URL manually.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isImage = mode === 'image';

  return (
    <div className="space-y-2">
      <Label>
        {label}{' '}
        {optional && <span className="text-muted-foreground font-normal">(optional)</span>}
      </Label>

      {/* Preview */}
      {value && (
        <div className="relative group w-full">
          {isImage ? (
            <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video w-full">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2.5 bg-muted/30">
              <FileBox className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate flex-1">
                {value.split('/').pop() ?? value}
              </span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* 3D model preview for STL files */}
          {!isImage && value && value.toLowerCase().endsWith('.stl') && (
            <div className="rounded-lg overflow-hidden border border-border mt-2">
                <StlViewer url={toProxiedUrl(value)} className="w-full h-[280px]" />
            </div>
          )}
          {/* Video preview */}
          {mode === 'video' && value && (
            <div className="rounded-lg overflow-hidden border border-border mt-2">
              <video
                src={toProxiedUrl(value)}
                controls
                className="w-full max-h-[280px] bg-black"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </div>
      )}

      {/* URL input + upload button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {!isImage && !value && (
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isImage ? 'https://... or upload below' : 'https://... or upload a file'}
            className={!isImage && !value ? 'pl-9' : ''}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          {isUploading ? 'Uploading...' : mode === 'image' ? 'Upload Image' : mode === 'video' ? 'Upload Video' : 'Upload File'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}