import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Search, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Profile, HOA } from '@/lib/types';

interface UserSpoofDialogProps {
  onSpoof: (profile: Profile) => void;
}

export function UserSpoofDialog({ onSpoof }: UserSpoofDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedHoaId, setSelectedHoaId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all HOAs
  const { data: hoas } = useQuery({
    queryKey: ['all-hoas-spoof'],
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

  // Fetch users based on filters
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-for-spoof', selectedHoaId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .order('name');
      
      if (selectedHoaId !== 'all') {
        query = query.eq('hoa_id', selectedHoaId);
      }
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSpoof = (profile: Profile) => {
    onSpoof(profile);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
          <Eye className="h-4 w-4" />
          Spoof User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-destructive" />
            Spoof as User
          </DialogTitle>
          <DialogDescription>
            View the app as another user for testing purposes. A warning banner will be displayed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
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
          <div className="border rounded-lg max-h-80 overflow-auto">
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
                    <TableHead>Role</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.user_roles?.[0]?.role === 'admin' ? 'default' : 'secondary'}>
                          {user.user_roles?.[0]?.role || 'resident'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSpoof(user)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Spoof
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
