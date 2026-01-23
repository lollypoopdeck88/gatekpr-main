import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Shield, UserCog, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { HOA, AppRole } from '@/lib/types';

interface ManageRolesDialogProps {
  trigger?: React.ReactNode;
}

export function ManageRolesDialog({ trigger }: ManageRolesDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedHoaId, setSelectedHoaId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  // Fetch all HOAs
  const { data: hoas } = useQuery({
    queryKey: ['all-hoas-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as HOA[];
    },
    enabled: open,
  });

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles', selectedHoaId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*, user_roles(id, role)')
        .order('name');
      
      if (selectedHoaId !== 'all') {
        query = query.eq('hoa_id', selectedHoaId);
      }
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Mutation to update role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, newRole, userName, previousRole }: { userId: string; roleId: string; newRole: AppRole; userName: string; previousRole: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', roleId);
      
      if (error) throw error;
      
      // Log the action
      await logAction({
        action: 'role_changed',
        entityType: 'user',
        entityId: userId,
        details: {
          user_name: userName,
          previous_role: previousRole,
          new_role: newRole,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  const handleRoleChange = (userId: string, roleId: string, newRole: AppRole, userName: string, previousRole: string) => {
    updateRoleMutation.mutate({ userId, roleId, newRole, userName, previousRole });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <UserCog className="h-4 w-4" />
            Manage Roles
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" />
            Manage User Roles
          </DialogTitle>
          <DialogDescription>
            Assign admin or resident roles to users. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="role-search">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="role-search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Label>HOA Filter</Label>
              <Select value={selectedHoaId} onValueChange={setSelectedHoaId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All HOAs</SelectItem>
                  {hoas?.map((hoa) => (
                    <SelectItem key={hoa.id} value={hoa.id}>
                      {hoa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => {
                    const currentRole = user.user_roles?.[0]?.role || 'resident';
                    const roleId = user.user_roles?.[0]?.id;
                    const isSuperAdmin = currentRole === 'super_admin';
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(currentRole)}>
                            {currentRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          ) : roleId ? (
                            <Select
                              value={currentRole}
                              onValueChange={(value) => handleRoleChange(user.user_id, roleId, value as AppRole, user.name, currentRole)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="resident">Resident</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">No role</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mr-3 opacity-50" />
                No users found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
