import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Send,
  Users
} from 'lucide-react';
import { parseCSV, generateCSVTemplate, downloadCSV } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendInviteEmail } from '@/lib/emailService';

interface InviteRow {
  email: string;
  house_number: string;
  street_name: string;
  city: string;
  state: string;
  zip_code: string;
  status?: 'pending' | 'success' | 'error';
  message?: string;
}

const REQUIRED_HEADERS = ['house_number', 'street_name', 'city', 'state', 'zip_code'];
const OPTIONAL_HEADERS = ['email'];

interface BulkInviteResidentsProps {
  hoaId: string;
  hoaName: string;
}

export function BulkInviteResidents({ hoaId, hoaName }: BulkInviteResidentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<InviteRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseCSV<InviteRow>(text, REQUIRED_HEADERS);
      
      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        setParsedData([]);
        return;
      }

      // Validate each row
      const validatedRows = result.rows.map((row, index) => {
        const errors: string[] = [];
        
        if (!row.house_number?.trim()) errors.push('Missing house number');
        if (!row.street_name?.trim()) errors.push('Missing street name');
        if (!row.city?.trim()) errors.push('Missing city');
        if (!row.state?.trim()) errors.push('Missing state');
        if (!row.zip_code?.trim()) errors.push('Missing ZIP code');
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push('Invalid email format');
        }

        return {
          ...row,
          status: errors.length > 0 ? 'error' as const : 'pending' as const,
          message: errors.length > 0 ? errors.join(', ') : undefined,
        };
      });

      setParseErrors([]);
      setParsedData(validatedRows);
      setResults(null);
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
    const sampleData = [
      {
        email: 'john@example.com',
        house_number: '123',
        street_name: 'Oak Lane',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
      },
      {
        email: '',
        house_number: '456',
        street_name: 'Maple Street',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
      },
    ];
    const csv = generateCSVTemplate(headers, sampleData);
    downloadCSV(csv, 'resident_invites_template.csv');
  };

  const processInvites = async () => {
    const validRows = parsedData.filter(row => row.status !== 'error');
    if (validRows.length === 0) {
      toast.error('No valid rows to process');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    let successCount = 0;
    let failedCount = 0;

    const updatedData = [...parsedData];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      if (row.status === 'error') {
        failedCount++;
        continue;
      }

      try {
        // Create invite
        const { data, error } = await supabase
          .from('resident_invites')
          .insert({
            hoa_id: hoaId,
            email: row.email || null,
            house_number: row.house_number,
            street_name: row.street_name,
            city: row.city,
            state: row.state,
            zip_code: row.zip_code,
            created_by: user!.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Send email if provided
        if (row.email) {
          const address = `${row.house_number} ${row.street_name}, ${row.city}, ${row.state} ${row.zip_code}`;
          await sendInviteEmail(row.email, data.invite_token, hoaName, address);
        }

        updatedData[i] = { ...row, status: 'success', message: 'Invite created' };
        successCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        updatedData[i] = { ...row, status: 'error', message };
        failedCount++;
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
      setParsedData([...updatedData]);
    }

    setIsProcessing(false);
    setResults({ success: successCount, failed: failedCount });
    queryClient.invalidateQueries({ queryKey: ['invites'] });
    
    if (successCount > 0) {
      toast.success(`Created ${successCount} invite${successCount > 1 ? 's' : ''}`);
    }
  };

  const getStatusBadge = (row: InviteRow) => {
    switch (row.status) {
      case 'success':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const validCount = parsedData.filter(r => r.status === 'pending').length;
  const errorCount = parsedData.filter(r => r.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk Invite Residents
        </CardTitle>
        <CardDescription>
          Upload a CSV file to send multiple resident invitations at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {parseErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{parsedData.length}</span>
                </span>
                {validCount > 0 && (
                  <span className="text-green-600">
                    Valid: <span className="font-medium">{validCount}</span>
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-destructive">
                    Errors: <span className="font-medium">{errorCount}</span>
                  </span>
                )}
              </div>
              <Button
                onClick={processInvites}
                disabled={isProcessing || validCount === 0}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send {validCount} Invite{validCount !== 1 ? 's' : ''}
              </Button>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processing... {progress}%
                </p>
              </div>
            )}

            {results && (
              <Alert className={results.failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Completed: {results.success} successful, {results.failed} failed
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{getStatusBadge(row)}</TableCell>
                      <TableCell>{row.email || '(No email)'}</TableCell>
                      <TableCell>
                        {row.house_number} {row.street_name}, {row.city}, {row.state} {row.zip_code}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Instructions */}
        {parsedData.length === 0 && parseErrors.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">
              Upload a CSV file with resident information
            </p>
            <p className="text-xs text-muted-foreground">
              Required columns: house_number, street_name, city, state, zip_code
              <br />
              Optional: email (to send invite automatically)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
