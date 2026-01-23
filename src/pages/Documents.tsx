import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2, Search, Filter, FolderOpen, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Document } from '@/lib/types';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';

export default function Documents() {
  const { effectiveHoaId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'category'>('date');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

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

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!documents) return [];
    const cats = [...new Set(documents.map(d => d.category))];
    return cats.sort();
  }, [documents]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    let result = documents.filter(doc => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'date':
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });

    return result;
  }, [documents, searchTerm, selectedCategory, sortBy]);

  // Group documents by category for visual organization
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, typeof filteredDocuments> = {};
    filteredDocuments.forEach(doc => {
      if (!groups[doc.category]) {
        groups[doc.category] = [];
      }
      groups[doc.category].push(doc);
    });
    return groups;
  }, [filteredDocuments]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Bylaws': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Rules': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Minutes': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Notices': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">Access community documents and files</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest First</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Summary Cards */}
        {documents && documents.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map(cat => (
              <Card 
                key={cat} 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === cat ? 'ring-2 ring-secondary' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getCategoryColor(cat)}`}>
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cat}</p>
                    <p className="text-xs text-muted-foreground">
                      {documents.filter(d => d.category === cat).length} files
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : filteredDocuments.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden md:table-cell">Size</TableHead>
                    <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(doc.category)}>
                          {doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewDocument(doc)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : documents && documents.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents match your search</p>
              <Button 
                variant="link" 
                onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents available</p>
              <p className="text-sm text-muted-foreground">HOA documents will appear here</p>
            </CardContent>
          </Card>
        )}

        {/* Document Preview Dialog */}
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      </div>
    </AppLayout>
  );
}
