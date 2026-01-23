import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { parseCSV, generateCSVTemplate, downloadCSV } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PaymentRow {
  resident_email: string;
  amount: string;
  paid_at: string;
  payment_method?: string;
}

interface ImportPaymentsProps {
  hoaId: string;
}

const REQUIRED_HEADERS = ['resident_email', 'amount', 'paid_at'];
const ALL_HEADERS = ['resident_email', 'amount', 'paid_at', 'payment_method'];

export function ImportPayments({ hoaId }: ImportPaymentsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<PaymentRow[]>([]);
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
    const { rows, errors: parseErrors } = parseCSV<PaymentRow>(text, REQUIRED_HEADERS);
    
    if (parseErrors.length > 0) {
      setErrors(parseErrors);
      setParsedData([]);
      return;
    }

    // Validate rows
    const validationErrors: string[] = [];
    const validRows: PaymentRow[] = [];
    
    rows.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.resident_email?.trim()) {
        validationErrors.push(`Row ${rowNum}: Missing resident_email`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.resident_email)) {
        validationErrors.push(`Row ${rowNum}: Invalid email format`);
      }
      
      if (!row.amount?.trim()) {
        validationErrors.push(`Row ${rowNum}: Missing amount`);
      } else if (isNaN(parseFloat(row.amount))) {
        validationErrors.push(`Row ${rowNum}: Invalid amount`);
      }
      
      if (!row.paid_at?.trim()) {
        validationErrors.push(`Row ${rowNum}: Missing paid_at date`);
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
        resident_email: 'john@example.com',
        amount: '150.00',
        paid_at: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'check'
      }
    ]);
    downloadCSV(template, 'payment_import_template.csv');
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    
    setIsImporting(true);
    let success = 0;
    let failed = 0;

    // First, get all residents for this HOA to map emails to IDs
    const { data: residents } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('hoa_id', hoaId);
    
    const emailToId = new Map(residents?.map(r => [r.email.toLowerCase(), r.id]) || []);

    for (const row of parsedData) {
      try {
        const residentId = emailToId.get(row.resident_email.toLowerCase().trim());
        
        if (!residentId) {
          console.error('Resident not found:', row.resident_email);
          failed++;
          continue;
        }

        const { error } = await supabase.from('payments').insert({
          resident_id: residentId,
          amount: parseFloat(row.amount),
          paid_at: new Date(row.paid_at).toISOString(),
          payment_method: row.payment_method || 'imported',
        });

        if (error) {
          console.error('Import error for', row.resident_email, error);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('Import exception for', row.resident_email, err);
        failed++;
      }
    }

    setImportResults({ success, failed });
    setIsImporting(false);
    
    if (success > 0) {
      toast.success(`Successfully imported ${success} payment${success > 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to import ${failed} payment${failed > 1 ? 's' : ''}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Import Payment History
        </CardTitle>
        <CardDescription>
          Upload historical payment records. Residents must exist in the system first.
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
          <Label htmlFor="payment-csv">Upload CSV File</Label>
          <Input
            id="payment-csv"
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
              <h4 className="font-medium">Preview ({parsedData.length} payments)</h4>
              <Badge variant="outline">{parsedData.length} ready to import</Badge>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.resident_email}</TableCell>
                      <TableCell>${parseFloat(row.amount).toFixed(2)}</TableCell>
                      <TableCell>{row.paid_at}</TableCell>
                      <TableCell>{row.payment_method || '-'}</TableCell>
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
                  Import {parsedData.length} Payments
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
