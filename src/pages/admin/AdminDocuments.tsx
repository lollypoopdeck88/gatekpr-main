import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Download, Upload, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Document, DocumentCategory, Profile } from '@/lib/types';
import { sendDocumentEmail } from '@/lib/emailService';

const CATEGORIES: DocumentCategory[] = ['Bylaws', 'Rules', 'Minutes', 'Notices', 'Other'];

export default function AdminDocuments() {
  const { profile, user, effectiveHoaId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Other' as DocumentCategory,
    file: null as File | null,
  });
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  // Get all residents for email notifications
  const { data: residents } = useQuery({
    queryKey: ['residents-emails', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('hoa_id', effectiveHoaId!)
        .eq('status', 'active');
      if (error) throw error;
      return data as Pick<Profile, 'email'>[];
    },
    enabled: !!effectiveHoaId,
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!effectiveHoaId,
  });

  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!formData.file) throw new Error('No file selected');
      setUploading(true);

      const fileExt = formData.file.name.split('.').pop();
      const filePath = `${effectiveHoaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      // Store the relative path, not a public URL (bucket is now private)
      const fileUrl = filePath;

      const { error } = await supabase.from('documents').insert({
        hoa_id: effectiveHoaId!,
        uploaded_by: user!.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        file_url: fileUrl,
        file_type: formData.file.type,
        file_size: formData.file.size,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      // Send email notifications if enabled
      if (sendEmailNotification && residents && residents.length > 0) {
        const emails = residents.map(r => r.email);
        const result = await sendDocumentEmail(
          emails,
          formData.name,
          formData.category,
          formData.description
        );
        if (result.success) {
          toast.success(`Document uploaded and ${emails.length} residents notified`);
        } else {
          toast.success('Document uploaded');
          toast.warning(`Failed to notify ${result.failedEmails.length} recipients`);
        }
      } else {
        toast.success('Document uploaded');
      }
      
      setIsDialogOpen(false);
      setFormData({ name: '', description: '', category: 'Other', file: null });
    },
    onError: () => toast.error('Failed to upload document'),
    onSettled: () => setUploading(false),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: Document) => {
      // Delete from storage - file_url now stores just the path
      const filePath = doc.file_url.includes('/documents/') 
        ? doc.file_url.split('/documents/').pop() 
        : doc.file_url;
      
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }
      
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleDownload = async (doc: Document) => {
    try {
      // Get the file path from URL or direct path
      const filePath = doc.file_url.includes('/documents/') 
        ? doc.file_url.split('/documents/').pop() 
        : doc.file_url;
      
      if (!filePath) {
        toast.error('Invalid file path');
        return;
      }

      // Create a signed URL with 1 hour expiry
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      
      // Open the signed URL in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground">Manage HOA documents and files</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Document Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="2024 Community Bylaws"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as DocumentCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, file, name: formData.name || file.name });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {formData.file ? formData.file.name : 'Choose file'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendEmail"
                    checked={sendEmailNotification}
                    onCheckedChange={(checked) => setSendEmailNotification(checked === true)}
                  />
                  <Label htmlFor="sendEmail" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Mail className="h-4 w-4" />
                    Notify all residents ({residents?.length || 0})
                  </Label>
                </div>
                <Button
                  onClick={() => uploadDocument.mutate()}
                  disabled={!formData.name || !formData.file || uploading}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : documents?.length === 0 ? (
              <p className="text-muted-foreground">No documents uploaded yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.category}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDocument.mutate(doc)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
