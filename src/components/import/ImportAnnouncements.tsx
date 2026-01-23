import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Bell, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { parseCSV, generateCSVTemplate, downloadCSV } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface AnnouncementRow {
  title: string;
  body: string;
  published_at?: string;
}

interface ImportAnnouncementsProps {
  hoaId: string;
}

const REQUIRED_HEADERS = ['title', 'body'];
const ALL_HEADERS = ['title', 'body', 'published_at'];

export function ImportAnnouncements({ hoaId }: ImportAnnouncementsProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<AnnouncementRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setImportResults(null);

    const text = await selectedFile.text();
    const { rows, errors: parseErrors } = parseCSV<AnnouncementRow>(text, REQUIRED_HEADERS);
    
    if (parseErrors.length > 0) {
      setErrors(parseErrors);
      setParsedData([]);
      return;
    }

    // Validate rows
    const validationErrors: string[] = [];
    const validRows: AnnouncementRow[] = [];
    
    rows.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.title?.trim()) {
        validationErrors.push(`Row ${rowNum}: Missing title`);
      }
      
      if (!row.body?.trim()) {
        validationErrors.push(`Row ${rowNum}: Missing body`);
      }
      
      if (!validationErrors.some(e => e.includes(`Row ${rowNum}`))) {
        validRows.push(row);
      }
    });

    setErrors(validationErrors);
    setParsedData(validRows);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(ALL_HEADERS, [
      {
        title: 'Welcome to our community!',
        body: 'We are excited to announce the launch of our new resident portal.',
        published_at: format(new Date(), 'yyyy-MM-dd')
      }
    ]);
    downloadCSV(template, 'announcement_import_template.csv');
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of parsedData) {
      try {
        const publishedAt = row.published_at 
          ? new Date(row.published_at).toISOString()
          : new Date().toISOString();

        const { error } = await supabase.from('announcements').insert({
          hoa_id: hoaId,
          author_id: user?.id,
          title: row.title.trim(),
          body: row.body.trim(),
          published_at: publishedAt,
        });

        if (error) {
          console.error('Import error for', row.title, error);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('Import exception for', row.title, err);
        failed++;
      }
    }

    setImportResults({ success, failed });
    setIsImporting(false);
    
    if (success > 0) {
      toast.success(`Successfully imported ${success} announcement${success > 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to import ${failed} announcement${failed > 1 ? 's' : ''}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Import Announcements
        </CardTitle>
        <CardDescription>
          Upload historical announcements from a CSV file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Download Template</p>
            <p className="text-sm text-muted-foreground">
              Get a sample CSV with the correct format
            </p>
          </div>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
        </div>

        {/* File Upload */}
        <div>
          <Label htmlFor="announcement-csv">Upload CSV File</Label>
          <Input
            id="announcement-csv"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-1"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Preview ({parsedData.length} announcements)</h4>
              <Badge variant="outline">{parsedData.length} ready to import</Badge>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Body (Preview)</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {row.body.substring(0, 60)}...
                      </TableCell>
                      <TableCell>{row.published_at || 'Today'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ...and {parsedData.length - 10} more
                </p>
              )}
            </div>

            <Button 
              onClick={handleImport} 
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parsedData.length} Announcements
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results */}
        {importResults && (
          <Alert className={importResults.failed > 0 ? '' : 'border-accent'}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Import complete: {importResults.success} successful, {importResults.failed} failed
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
