import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Download, ExternalLink, Loader2, FileText, Image, AlertCircle } from 'lucide-react';
import type { Document } from '@/lib/types';

interface DocumentPreviewDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreviewDialog({ document, open, onOpenChange }: DocumentPreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && document) {
      loadSignedUrl();
    } else {
      setSignedUrl(null);
      setError(null);
    }
  }, [open, document]);

  const loadSignedUrl = async () => {
    if (!document) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const filePath = document.file_url.includes('/documents/') 
        ? document.file_url.split('/documents/').pop() 
        : document.file_url;
      
      if (!filePath) {
        throw new Error('Invalid file path');
      }

      const { data, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (urlError) throw urlError;
      setSignedUrl(data.signedUrl);
    } catch (err) {
      console.error('Failed to load document:', err);
      setError('Failed to load document preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const isImage = document?.file_type?.startsWith('image/');
  const isPdf = document?.file_type === 'application/pdf';
  const canPreview = isImage || isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {document?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadSignedUrl}>
                Try Again
              </Button>
            </div>
          ) : signedUrl ? (
            canPreview ? (
              <div className="h-[60vh] w-full">
                {isPdf ? (
                  <iframe
                    src={signedUrl}
                    className="w-full h-full border rounded-lg"
                    title={document?.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg overflow-auto">
                    <img
                      src={signedUrl}
                      alt={document?.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">{document?.name}</p>
                <p className="text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )
          ) : null}
        </div>

        {signedUrl && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
