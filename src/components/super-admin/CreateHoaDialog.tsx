import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuditLog } from '@/hooks/useAuditLog';

interface CreateHoaDialogProps {
  trigger?: React.ReactNode;
}

export function CreateHoaDialog({ trigger }: CreateHoaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    billingEmail: '',
  });
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('HOA name is required');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.from('hoas').insert({
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        billing_email: formData.billingEmail.trim() || null,
      }).select().single();

      if (error) throw error;

      // Log the action
      await logAction({
        action: 'hoa_created',
        entityType: 'hoa',
        entityId: data.id,
        details: {
          hoa_name: formData.name.trim(),
          address: formData.address.trim() || null,
        },
      });

      toast.success(`HOA "${formData.name}" created successfully!`);
      setFormData({ name: '', address: '', billingEmail: '' });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['all-hoas'] });
      queryClient.invalidateQueries({ queryKey: ['all-hoas-import'] });
    } catch (error: any) {
      console.error('Error creating HOA:', error);
      toast.error(error.message || 'Failed to create HOA');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create New HOA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-secondary" />
            Create New HOA
          </DialogTitle>
          <DialogDescription>
            Set up a new homeowners association. You can add residents and configure settings after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="hoa-name">HOA Name *</Label>
            <Input
              id="hoa-name"
              placeholder="Sunset Valley HOA"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="hoa-address">Address</Label>
            <Textarea
              id="hoa-address"
              placeholder="123 Main Street, Springfield, IL 62701"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="hoa-billing-email">Billing Email</Label>
            <Input
              id="hoa-billing-email"
              type="email"
              placeholder="billing@example.com"
              value={formData.billingEmail}
              onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create HOA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
