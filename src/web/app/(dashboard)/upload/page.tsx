'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { filesApi, UploadedFile } from '@/lib/api/files';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { FileDropzone } from './file-dropzone';
import { FileAnalysisPanel } from './file-analysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShoppingCart } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadedFile(null);

    try {
      const response = await filesApi.upload(file);
      setUploadedFile(response.data);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestQuote = () => {
    if (uploadedFile) {
      router.push(`/quotes/new?fileId=${uploadedFile.id}`);
    }
  };

  const handlePlaceOrder = () => {
    if (uploadedFile) {
      router.push(`/orders/new?fileId=${uploadedFile.id}`);
    }
  };

  if (!isInitialized) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Upload 3D Model</h1>
        <p className="text-muted-foreground mt-1">
          Upload your file to get a quote or place an order
        </p>
      </div>

      <div className="space-y-6">
        {/* Dropzone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select File</CardTitle>
          </CardHeader>
          <CardContent>
            <FileDropzone
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
            />
            {uploadError && (
              <p className="text-sm text-destructive mt-2">{uploadError}</p>
            )}
          </CardContent>
        </Card>

        {/* Analysis results */}
        {uploadedFile && (
          <FileAnalysisPanel file={uploadedFile} />
        )}

        {/* Next step buttons */}
        {uploadedFile && !isUploading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What would you like to do?</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={handleRequestQuote}
              >
                <FileText className="h-6 w-6" />
                <span className="font-medium">Request a Quote</span>
                <span className="text-xs text-muted-foreground text-wrap">
                  Get pricing from our team before committing
                </span>
              </Button>

              <Button
                className="h-auto py-4 flex flex-col gap-2"
                onClick={handlePlaceOrder}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="font-medium">Place an Order</span>
                <span className="text-xs text-primary-foreground/70 text-wrap">
                  Choose material and submit directly
                </span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}