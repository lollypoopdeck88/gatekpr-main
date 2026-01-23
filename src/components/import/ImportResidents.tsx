import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { parseCSV, generateCSVTemplate, downloadCSV } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResidentRow {
  name: string;
  email: string;
  phone?: string;
  house_number?: string;
  street_name?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface ImportResidentsProps {
  hoaId: string;
}

const REQUIRED_HEADERS = ['name', 'email'];
const ALL_HEADERS = ['name', 'email', 'phone', 'house_number', 'street_name', 'city', 'state', 'zip_code'];

export function ImportResidents({ hoaId }: ImportResidentsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ResidentRow[]>([]);
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
    const { rows, errors: parseErrors } = parseCSV<ResidentRow>(text, REQUIRED_HEADERS);
    
    if (parseErrors.length > 0) {
      setErrors(parseErrors);
      setParsedData([]);
      return;
    }

    // Validate rows
    const validationErrors: string[] = [];
    const validRows: ResidentRow[] = [];
    
    rows.forEach((row, index) => {
      if (!row.name?.trim()) {
        validationErrors.push(`Row ${index + 2}: Missing name`);
      }
      if (!row.email?.trim()) {
        validationErrors.push(`Row ${index + 2}: Missing email`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        validationErrors.push(`Row ${index + 2}: Invalid email format`);
      }
      
      if (validationErrors.length === 0 || validationErrors.every(e => !e.includes(`Row ${index + 2}`))) {
        validRows.push(row);
      }
    });

    setErrors(validationErrors);
    setParsedData(validRows);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(ALL_HEADERS, [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        house_number: '123',
        street_name: 'Main Street',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701'
      }
    ]);
    downloadCSV(template, 'resident_import_template.csv');
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of parsedData) {
      try {
        // Create invite for each resident
        const { error } = await supabase.from('resident_invites').insert({
          hoa_id: hoaId,
          email: row.email.toLowerCase().trim(),
          house_number: row.house_number || '',
          street_name: row.street_name || '',
          city: row.city || '',
          state: row.state || '',
          zip_code: row.zip_code || '',
        });

        if (error) {
          console.error('Import error for', row.email, error);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('Import exception for', row.email, err);
        failed++;
      }
    }

    setImportResults({ success, failed });
    setIsImporting(false);
    
    if (success > 0) {
      toast.success(`Successfully created ${success} resident invite${success > 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to import ${failed} resident${failed > 1 ? 's' : ''}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Import Residents
        </CardTitle>
        <CardDescription>
          Upload a CSV file to create resident invites. Residents will receive an email invitation to join.
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
          <Label htmlFor="resident-csv">Upload CSV File</Label>
          <Input
            id="resident-csv"
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
              <h4 className="font-medium">Preview ({parsedData.length} residents)</h4>
              <Badge variant="outline">{parsedData.length} ready to import</Badge>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {[row.house_number, row.street_name, row.city, row.state].filter(Boolean).join(', ') || '-'}
                      </TableCell>
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
                  Import {parsedData.length} Residents
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
