import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { ImportResidents } from '@/components/import/ImportResidents';
import { ImportPayments } from '@/components/import/ImportPayments';
import { ImportAnnouncements } from '@/components/import/ImportAnnouncements';
import { ImportDocuments } from '@/components/import/ImportDocuments';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Users, CreditCard, Bell, FileText, AlertCircle, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HOA } from '@/lib/types';
import { useState } from 'react';

export default function AdminDataImport() {
  const { isSuperAdmin, isLoading } = useAuth();
  const [selectedHoaId, setSelectedHoaId] = useState<string | null>(null);

  // Fetch all HOAs for super admin
  const { data: hoas } = useQuery({
    queryKey: ['all-hoas-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as HOA[];
    },
    enabled: isSuperAdmin,
  });

  if (isLoading) {
    return (
      <AppLayout adminOnly>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
        </div>
      </AppLayout>
    );
  }

  // Only super admins can access this page
  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Upload className="h-6 w-6 text-secondary" />
            Data Import
          </h1>
          <p className="text-muted-foreground mt-1">
            Bulk import residents, payments, announcements, and documents for white-glove onboarding.
          </p>
        </div>

        {/* HOA Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Community
            </CardTitle>
            <CardDescription>
              Choose which HOA to import data into
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedHoaId || ''} onValueChange={setSelectedHoaId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select an HOA..." />
              </SelectTrigger>
              <SelectContent>
                {hoas?.map((hoa) => (
                  <SelectItem key={hoa.id} value={hoa.id}>
                    {hoa.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Import Tools */}
        {!selectedHoaId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select an HOA above to access import tools.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="residents" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="residents" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Residents</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Announcements</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="residents">
              <ImportResidents hoaId={selectedHoaId} />
            </TabsContent>

            <TabsContent value="payments">
              <ImportPayments hoaId={selectedHoaId} />
            </TabsContent>

            <TabsContent value="announcements">
              <ImportAnnouncements hoaId={selectedHoaId} />
            </TabsContent>

            <TabsContent value="documents">
              <ImportDocuments hoaId={selectedHoaId} />
            </TabsContent>
          </Tabs>
        )}

        {/* Import Tips */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Import Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Residents:</strong> Creates invite links. Import residents first, then payments.</p>
            <p><strong>Payments:</strong> Requires residents to exist first. Match by email address.</p>
            <p><strong>Announcements:</strong> Imports directly. Leave date blank for today's date.</p>
            <p><strong>Documents:</strong> Upload multiple files at once with the same category.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
