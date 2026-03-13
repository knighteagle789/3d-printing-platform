'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileBox, Video } from 'lucide-react';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import apiClient from '@/lib/api-client';
import { toProxiedUrl } from '@/lib/utils';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

interface MediaUploadFieldProps {
  label:     string;
  value:     string;
  onChange:  (url: string) => void;
  mode:      'image' | 'model' | 'video';
  optional?: boolean;
  error?:    string;
}

export function MediaUploadField({
  label, value, onChange, mode, optional = false, error,
}: MediaUploadFieldProps) {
  const [isUploading,  setIsUploading]  = useState(false);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
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
      const formData = new FormData();
      formData.append('file', file);

      if (mode === 'image') {
        const res = await apiClient.post<{ url: string }>('/Files/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.url);
      } else if (mode === 'video') {
        const res = await apiClient.post<{ url: string }>('/Files/upload-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.url);
      } else {
        const res = await apiClient.post<{ storageUrl: string }>('/Files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.storageUrl);
      }
    } catch {
      setUploadError('Upload failed — please try again or paste a URL manually.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const uploadLabel = isUploading
    ? 'Uploading...'
    : mode === 'image' ? 'Upload Image'
    : mode === 'video' ? 'Upload Video'
    : 'Upload File';

  return (
    <div className="space-y-2">

      {/* ── Preview ── */}
      {value && (
        <div className="relative group">

          {mode === 'image' && (
            <div className="relative border border-border bg-surface-alt aspect-video w-full overflow-hidden">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}

          {mode === 'video' && (
            <>
              <div className="flex items-center gap-3 border border-border bg-surface-alt px-3 py-2.5">
                <Video className="h-4 w-4 text-accent shrink-0" />
                <span className={`${mono.className} text-[10px] text-text-secondary truncate flex-1`}>
                  {value.split('/').pop() ?? value}
                </span>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-text-muted hover:text-danger transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="border border-border mt-1.5 overflow-hidden">
                <video src={toProxiedUrl(value)} controls className="w-full max-h-[280px] bg-black">
                  Your browser does not support the video tag.
                </video>
              </div>
            </>
          )}

          {mode === 'model' && (
            <>
              <div className="flex items-center gap-3 border border-border bg-surface-alt px-3 py-2.5">
                <FileBox className="h-4 w-4 text-accent shrink-0" />
                <span className={`${mono.className} text-[10px] text-text-secondary truncate flex-1`}>
                  {value.split('/').pop() ?? value}
                </span>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-text-muted hover:text-danger transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {value.toLowerCase().endsWith('.stl') && (
                <div className="border border-border mt-1.5 overflow-hidden">
                  <StlViewer url={toProxiedUrl(value)} className="w-full h-[280px]" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── URL input + upload button ── */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... or upload a file"
          className={`${mono.className} flex-1 h-9 bg-surface border border-border px-3 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className={`${mono.className} inline-flex items-center gap-1.5 shrink-0 px-3 h-9 border border-border text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-primary hover:border-border-strong transition-colors disabled:opacity-40`}
        >
          <Upload className="h-3 w-3" />
          {uploadLabel}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadError && <p className={`${mono.className} text-[10px] text-danger`}>{uploadError}</p>}
      {error       && <p className={`${mono.className} text-[10px] text-danger`}>{error}</p>}
    </div>
  );
}