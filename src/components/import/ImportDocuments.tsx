import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { DocumentCategory } from '@/lib/types';

interface ImportDocumentsProps {
  hoaId: string;
}

const CATEGORIES: DocumentCategory[] = ['Bylaws', 'Rules', 'Minutes', 'Notices', 'Other'];

export function ImportDocuments({ hoaId }: ImportDocumentsProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileList | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('Other');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number } | null>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setUploadResults(null);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    let success = 0;
    let failed = 0;

    for (const file of Array.from(files)) {
      try {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${hoaId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error for', file.name, uploadError);
          failed++;
          continue;
        }

        // Store the relative path, not a public URL (bucket is now private)
        const fileUrl = fileName;

        // Create document record
        const { error: dbError } = await supabase.from('documents').insert({
          hoa_id: hoaId,
          uploaded_by: user?.id,
          name: file.name,
          description: description || null,
          category,
          file_url: fileUrl,
          file_type: file.type || fileExt,
          file_size: file.size,
        });

        if (dbError) {
          console.error('DB error for', file.name, dbError);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('Upload exception for', file.name, err);
        failed++;
      }
    }

    setUploadResults({ success, failed });
    setIsUploading(false);
    
    if (success > 0) {
      toast.success(`Successfully uploaded ${success} document${success > 1 ? 's' : ''}`);
      setFiles(null);
      setDescription('');
      // Reset file input
      const input = document.getElementById('document-files') as HTMLInputElement;
      if (input) input.value = '';
    }
    if (failed > 0) {
      toast.error(`Failed to upload ${failed} document${failed > 1 ? 's' : ''}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bulk Upload Documents
        </CardTitle>
        <CardDescription>
          Upload multiple documents at once. All files will share the same category.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selection */}
        <div>
          <Label htmlFor="doc-category">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="doc-description">Description (optional)</Label>
          <Textarea
            id="doc-description"
            placeholder="Brief description for these documents..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* File Upload */}
        <div>
          <Label htmlFor="document-files">Select Files</Label>
          <Input
            id="document-files"
            type="file"
            multiple
            onChange={handleFilesChange}
            className="mt-1"
          />
          {files && files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={isUploading || !files || files.length === 0}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {files?.length || 0} Document{files && files.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        {/* Results */}
        {uploadResults && (
          <Alert className={uploadResults.failed > 0 ? '' : 'border-accent'}>
            {uploadResults.failed > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              Upload complete: {uploadResults.success} successful, {uploadResults.failed} failed
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
