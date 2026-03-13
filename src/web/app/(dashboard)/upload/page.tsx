'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { filesApi, UploadedFile } from '@/lib/api/files';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { FileDropzone } from './file-dropzone';
import { FileAnalysisPanel } from './file-analysis';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import { toProxiedUrl } from '@/lib/utils';
import { FileText, ShoppingCart } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono  = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const [isUploading,  setIsUploading]  = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadedFile(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file.name.toLowerCase().endsWith('.stl')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    try {
      const response = await filesApi.upload(file);
      setUploadedFile(response.data);
    } catch {
      setUploadError('Upload failed — please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestQuote = () => {
    if (uploadedFile) router.push(`/quotes/new?fileId=${uploadedFile.id}`);
  };

  const handlePlaceOrder = () => {
    if (uploadedFile) router.push(`/orders/new?fileId=${uploadedFile.id}`);
  };

  if (!isInitialized || !isAuthenticated) return null;

  return (
    <div className="p-8 max-w-3xl">

      {/* ── Page header ── */}
      <div className="mb-8">
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-700 mb-2`}>
          Upload
        </p>
        <h1 className={`${bebas.className} text-4xl text-text-primary tracking-wide`}>
          Upload 3D Model
        </h1>
        <p className={`${mono.className} text-[11px] text-text-muted mt-1`}>
          STL · OBJ · 3MF · STEP · IGES · G-Code &nbsp;·&nbsp; Max 250 MB
        </p>
      </div>

      <div className="space-y-4">

        {/* ── Drop zone ── */}
        <FileDropzone onFileSelect={handleFileSelect} isUploading={isUploading} />

        {uploadError && (
          <p className={`${mono.className} text-[10px] text-red-400`}>{uploadError}</p>
        )}

        {/* ── 3D Preview ── */}
        {previewUrl && (
          <div className="border border-border overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface"
              
            >
              <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
                3D Preview
              </span>
              {isUploading && (
                <span className={`${mono.className} text-[9px] text-amber-700 animate-pulse`}>
                  Uploading...
                </span>
              )}
            </div>
            <StlViewer
              url={toProxiedUrl(previewUrl)}
              className="w-full h-[400px]"
            />
          </div>
        )}

        {/* ── File analysis ── */}
        {uploadedFile && <FileAnalysisPanel file={uploadedFile} />}

        {/* ── Next step CTA ── */}
        {uploadedFile && !isUploading && (
          <div className="border border-border bg-surface" >
            <div className="px-4 py-2.5 border-b border-border">
              <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
                Next Step
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">

              <button
                onClick={handleRequestQuote}
                className="group border border-border hover:border-border p-5 text-left transition-colors"
              >
                <FileText className="h-5 w-5 text-text-muted group-hover:text-text-secondary mb-3 transition-colors" />
                <p className={`${mono.className} text-[11px] text-text-secondary group-hover:text-text-primary mb-1.5 transition-colors`}>
                  Request a Quote
                </p>
                <p className={`${mono.className} text-[9px] text-text-muted leading-relaxed`}>
                  Get pricing from our team before committing
                </p>
              </button>

              <button
                onClick={handlePlaceOrder}
                className="group border border-amber-400/20 hover:border-amber-400/50 bg-amber-400/[0.03] hover:bg-amber-400/[0.06] p-5 text-left transition-colors"
              >
                <ShoppingCart className="h-5 w-5 text-amber-700 group-hover:text-amber-700 mb-3 transition-colors" />
                <p className={`${mono.className} text-[11px] text-amber-700 group-hover:text-accent mb-1.5 transition-colors`}>
                  Place an Order
                </p>
                <p className={`${mono.className} text-[9px] text-text-muted leading-relaxed`}>
                  Choose material and submit directly
                </p>
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}