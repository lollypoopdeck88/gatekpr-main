import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Copy, Mail, Loader2, Link as LinkIcon, Trash2, Send, Upload } from 'lucide-react';
import type { Profile, ResidentInvite } from '@/lib/types';
import { sendInviteEmail } from '@/lib/emailService';
import { BulkInviteResidents } from '@/components/import/BulkInviteResidents';

export default function AdminResidents() {
  const { profile, user, effectiveHoaId } = useAuth();
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  // Get HOA name for emails
  const { data: hoaData } = useQuery({
    queryKey: ['hoa', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('name')
        .eq('id', effectiveHoaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });
  const hoaName = hoaData?.name;

  const { data: residents, isLoading } = useQuery({
    queryKey: ['residents', effectiveHoaId],
    queryFn: async () => {
      // First get all profiles in this HOA
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .order('name');
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get user roles to filter out super_admins
      const userIds = profiles.map(p => p.user_id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (rolesError) throw rolesError;
      
      // Create a set of super_admin user IDs
      const superAdminIds = new Set(
        (roles || [])
          .filter(r => r.role === 'super_admin')
          .map(r => r.user_id)
      );
      
      // Filter out super_admins from the list
      return profiles.filter(p => !superAdminIds.has(p.user_id)) as Profile[];
    },
    enabled: !!effectiveHoaId,
  });

  const { data: invites } = useQuery({
    queryKey: ['invites', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resident_invites')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .is('used_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ResidentInvite[];
    },
    enabled: !!effectiveHoaId,
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('resident_invites')
        .insert({
          hoa_id: effectiveHoaId!,
          email: email || null,
          house_number: houseNumber,
          street_name: streetName,
          city,
          state,
          zip_code: zipCode,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ResidentInvite;
    },
    onSuccess: async (data) => {
      const link = `${window.location.origin}/invite?token=${data.invite_token}`;
      setGeneratedLink(link);
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      
      // Send email if email was provided
      if (email) {
        const address = `${houseNumber} ${streetName}, ${city}, ${state} ${zipCode}`;
        const result = await sendInviteEmail(email, data.invite_token, hoaName || 'Your HOA', address);
        if (result.success) {
          toast({ title: 'Invite sent!', description: `Email sent to ${email}` });
        } else {
          toast({ title: 'Invite created!', description: 'Email could not be sent, but link is ready to copy.' });
        }
      } else {
        toast({ title: 'Invite created!', description: 'Copy the link to share with the resident.' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('resident_invites')
        .delete()
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Invite deleted' });
    },
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    createInvite.mutate();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: 'Link copied!', description: 'Share this link with the resident.' });
  };

  const resetForm = () => {
    setEmail('');
    setHouseNumber('');
    setStreetName('');
    setCity('');
    setState('');
    setZipCode('');
    setGeneratedLink('');
  };

  const formatAddress = (r: Profile) => {
    if (r.house_number && r.street_name) {
      return `${r.house_number} ${r.street_name}`;
    }
    return r.unit_number || '-';
  };

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Residents</h1>
            <p className="text-muted-foreground">View and manage community members</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowBulkInvite(!showBulkInvite)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New Resident</DialogTitle>
                <DialogDescription>
                  Create an invite link for a new resident to join your community.
                </DialogDescription>
              </DialogHeader>
              
              {generatedLink ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <LinkIcon className="h-5 w-5" />
                      <span className="font-medium">Invite Link Generated!</span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={generatedLink} readOnly className="text-xs" />
                      <Button size="icon" variant="outline" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This link expires in 30 days. Share it with the resident via email or text.
                    </p>
                  </div>
                  <Button className="w-full" variant="outline" onClick={resetForm}>
                    Create Another Invite
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="resident@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      If provided, only this email can use the invite.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="houseNumber">House #</Label>
                      <Input
                        id="houseNumber"
                        placeholder="123"
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="streetName">Street Name</Label>
                      <Input
                        id="streetName"
                        placeholder="Oak Lane"
                        value={streetName}
                        onChange={(e) => setStreetName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Los Angeles"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="CA"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        placeholder="90210"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createInvite.isPending}>
                      {createInvite.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Generate Invite Link
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Bulk Import Section */}
        {showBulkInvite && effectiveHoaId && (
          <BulkInviteResidents hoaId={effectiveHoaId} hoaName={hoaName || 'Your Community'} />
        )}

        <Tabs defaultValue="residents">
          <TabsList>
            <TabsTrigger value="residents">Residents ({residents?.length || 0})</TabsTrigger>
            <TabsTrigger value="invites">Pending Invites ({invites?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="residents">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : residents?.length === 0 ? (
                  <p className="text-muted-foreground">No residents found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residents?.map((resident) => (
                        <TableRow key={resident.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={resident.avatar_url || undefined} />
                                <AvatarFallback>
                                  {resident.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{resident.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{resident.email}</TableCell>
                          <TableCell>{formatAddress(resident)}</TableCell>
                          <TableCell>{resident.phone || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(resident.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            <Card>
              <CardContent className="pt-6">
                {invites?.length === 0 ? (
                  <p className="text-muted-foreground">No pending invites</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites?.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>{invite.email || '(Any email)'}</TableCell>
                          <TableCell>
                            {invite.house_number} {invite.street_name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invite.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const link = `${window.location.origin}/invite?token=${invite.invite_token}`;
                                  navigator.clipboard.writeText(link);
                                  toast({ title: 'Link copied!' });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteInvite.mutate(invite.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
