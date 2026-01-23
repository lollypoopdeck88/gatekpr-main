import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Building,
  Calendar,
  Settings,
  Users,
  MapPin,
  DollarSign,
  Trash2,
  Edit,
} from "lucide-react";
import { SpaceAvailabilityEditor } from "@/components/spaces/SpaceAvailabilityEditor";
import { SpaceBlackoutDates } from "@/components/spaces/SpaceBlackoutDates";
import { ReservationCalendar } from "@/components/spaces/ReservationCalendar";
import { SpaceForm, SpaceFormData } from "@/components/spaces/SpaceForm";

interface CommunitySpace {
  id: string;
  hoa_id: string;
  name: string;
  description: string | null;
  location_notes: string | null;
  capacity: number | null;
  pricing_info: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminSpaces() {
  const { effectiveHoaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<CommunitySpace | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<CommunitySpace | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location_notes: "",
    capacity: "",
    pricing_info: "",
    is_active: true,
  });

  const { data: spaces, isLoading } = useQuery({
    queryKey: ["community-spaces", effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_spaces")
        .select("*")
        .eq("hoa_id", effectiveHoaId!)
        .order("name");
      if (error) throw error;
      return data as CommunitySpace[];
    },
    enabled: !!effectiveHoaId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("community_spaces").insert({
        hoa_id: effectiveHoaId!,
        name: data.name,
        description: data.description || null,
        location_notes: data.location_notes || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        pricing_info: data.pricing_info || null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-spaces"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Space created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating space",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("community_spaces")
        .update({
          name: data.name,
          description: data.description || null,
          location_notes: data.location_notes || null,
          capacity: data.capacity ? parseInt(data.capacity) : null,
          pricing_info: data.pricing_info || null,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-spaces"] });
      setEditingSpace(null);
      resetForm();
      toast({ title: "Space updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating space",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("community_spaces")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-spaces"] });
      toast({ title: "Space deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting space",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      location_notes: "",
      capacity: "",
      pricing_info: "",
      is_active: true,
    });
  };

  const openEdit = (space: CommunitySpace) => {
    setFormData({
      name: space.name,
      description: space.description || "",
      location_notes: space.location_notes || "",
      capacity: space.capacity?.toString() || "",
      pricing_info: space.pricing_info || "",
      is_active: space.is_active,
    });
    setEditingSpace(space);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (editingSpace) {
      updateMutation.mutate({ id: editingSpace.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (selectedSpace) {
    return (
      <AppLayout adminOnly>
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <Button
                variant='ghost'
                onClick={() => setSelectedSpace(null)}
                className='mb-2'>
                ← Back to Spaces
              </Button>
              <h1 className='text-2xl font-bold text-foreground'>
                {selectedSpace.name}
              </h1>
              <p className='text-muted-foreground'>
                {selectedSpace.description || "No description"}
              </p>
            </div>
            <Badge variant={selectedSpace.is_active ? "default" : "secondary"}>
              {selectedSpace.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Tabs defaultValue='reservations'>
            <TabsList>
              <TabsTrigger value='reservations'>Reservations</TabsTrigger>
              <TabsTrigger value='availability'>Availability</TabsTrigger>
              <TabsTrigger value='blackouts'>Blackout Dates</TabsTrigger>
            </TabsList>
            <TabsContent value='reservations' className='mt-4'>
              <ReservationCalendar spaceId={selectedSpace.id} isAdmin />
            </TabsContent>
            <TabsContent value='availability' className='mt-4'>
              <SpaceAvailabilityEditor spaceId={selectedSpace.id} />
            </TabsContent>
            <TabsContent value='blackouts' className='mt-4'>
              <SpaceBlackoutDates spaceId={selectedSpace.id} />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout adminOnly>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>
              Community Spaces
            </h1>
            <p className='text-muted-foreground'>
              Manage reservable community spaces
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className='h-4 w-4 mr-2' />
                Add Space
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Community Space</DialogTitle>
              </DialogHeader>
              <SpaceForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Space"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3].map((i) => (
              <Card key={i} className='animate-pulse'>
                <CardHeader>
                  <div className='h-6 bg-muted rounded w-3/4' />
                </CardHeader>
                <CardContent>
                  <div className='h-20 bg-muted rounded' />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : spaces?.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <Building className='h-12 w-12 text-muted-foreground mb-4' />
              <h2 className='text-lg font-medium mb-2'>No Community Spaces</h2>
              <p className='text-muted-foreground text-center max-w-md mb-4'>
                Create your first community space for residents to reserve.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}>
                <Plus className='h-4 w-4 mr-2' />
                Add Space
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {spaces?.map((space) => (
              <Card
                key={space.id}
                className='cursor-pointer hover:shadow-md transition-shadow'>
                <CardHeader className='pb-2'>
                  <div className='flex justify-between items-start'>
                    <CardTitle className='text-lg'>{space.name}</CardTitle>
                    <Badge variant={space.is_active ? "default" : "secondary"}>
                      {space.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground mb-4 line-clamp-2'>
                    {space.description || "No description"}
                  </p>
                  <div className='space-y-2 text-sm'>
                    {space.location_notes && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <MapPin className='h-4 w-4' />
                        <span className='truncate'>{space.location_notes}</span>
                      </div>
                    )}
                    {space.capacity && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Users className='h-4 w-4' />
                        <span>Up to {space.capacity} people</span>
                      </div>
                    )}
                    {space.pricing_info && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <DollarSign className='h-4 w-4' />
                        <span className='truncate'>{space.pricing_info}</span>
                      </div>
                    )}
                  </div>
                  <div className='flex gap-2 mt-4'>
                    <Button
                      size='sm'
                      variant='outline'
                      className='flex-1'
                      onClick={() => setSelectedSpace(space)}>
                      <Calendar className='h-4 w-4 mr-1' />
                      Manage
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => openEdit(space)}>
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-destructive'
                      onClick={() => {
                        if (
                          confirm(
                            "Delete this space? This will also delete all reservations."
                          )
                        ) {
                          deleteMutation.mutate(space.id);
                        }
                      }}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editingSpace}
          onOpenChange={(open) => !open && setEditingSpace(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Community Space</DialogTitle>
            </DialogHeader>
            <SpaceForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant='outline' onClick={() => setEditingSpace(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
