import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Search, AlertTriangle, CheckCircle, Clock, FileText, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateViolationDialog } from '@/components/violations/CreateViolationDialog';
import { ViolationDetailsDialog } from '@/components/violations/ViolationDetailsDialog';
import type { Violation, ViolationCategory } from '@/lib/violationTypes';
import { DEFAULT_VIOLATION_CATEGORIES } from '@/lib/violationTypes';

export default function AdminViolations() {
  const { effectiveHoaId, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  // Fetch violation categories
  const { data: categories } = useQuery({
    queryKey: ['violation-categories', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violation_categories')
        .select('*')
        .eq('hoa_id', effectiveHoaId!);
      
      if (error) throw error;
      
      // If no categories exist, create defaults
      if (!data || data.length === 0) {
        const defaultCats = DEFAULT_VIOLATION_CATEGORIES.map(cat => ({
          ...cat,
          hoa_id: effectiveHoaId!,
        }));
        
        const { data: inserted, error: insertError } = await supabase
          .from('violation_categories')
          .insert(defaultCats)
          .select();
        
        if (insertError) throw insertError;
        return inserted as ViolationCategory[];
      }
      
      return data as ViolationCategory[];
    },
    enabled: !!effectiveHoaId,
  });

  // Fetch violations with resident info
  const { data: violations, isLoading } = useQuery({
    queryKey: ['violations', effectiveHoaId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('violations')
        .select(`
          *,
          resident:profiles!violations_resident_id_fkey(id, name, email),
          category:violation_categories(*)
        `)
        .eq('hoa_id', effectiveHoaId!)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Violation[];
    },
    enabled: !!effectiveHoaId,
  });

  const filteredViolations = violations?.filter(v => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      v.title.toLowerCase().includes(search) ||
      v.resident?.name?.toLowerCase().includes(search) ||
      v.location?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge variant="default" className="bg-blue-500"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'acknowledged':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Acknowledged</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Disputed</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'waived':
        return <Badge variant="outline">Waived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = {
    total: violations?.length || 0,
    draft: violations?.filter(v => v.status === 'draft').length || 0,
    sent: violations?.filter(v => v.status === 'sent').length || 0,
    disputed: violations?.filter(v => v.status === 'disputed').length || 0,
    resolved: violations?.filter(v => ['resolved', 'acknowledged', 'waived'].includes(v.status)).length || 0,
  };

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Violations</h1>
            <p className="text-muted-foreground">Manage violation notices and track compliance</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Violation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('draft')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold text-gray-500">{stats.draft}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('sent')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold text-blue-500">{stats.sent}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('disputed')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Disputed</p>
              <p className="text-2xl font-bold text-red-500">{stats.disputed}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('resolved')}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search violations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Violations Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Violation</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredViolations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No violations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredViolations?.map((violation) => (
                    <TableRow key={violation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedViolation(violation)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {violation.ai_generated && (
                            <Sparkles className="h-4 w-4 text-purple-500" />
                          )}
                          <div>
                            <p className="font-medium">{violation.title}</p>
                            {violation.location && (
                              <p className="text-sm text-muted-foreground">{violation.location}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{violation.resident?.name || 'Unknown'}</TableCell>
                      <TableCell>{violation.category?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(violation.observed_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(violation.status)}</TableCell>
                      <TableCell>
                        {violation.fine_amount > 0 
                          ? `$${(violation.fine_amount / 100).toFixed(2)}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Violation Dialog */}
        <CreateViolationDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          categories={categories || []}
          hoaId={effectiveHoaId!}
        />

        {/* Violation Details Dialog */}
        {selectedViolation && (
          <ViolationDetailsDialog
            violation={selectedViolation}
            open={!!selectedViolation}
            onOpenChange={(open) => !open && setSelectedViolation(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
