import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LogOut,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationPreferences } from "@/components/profile/NotificationPreferences";

export default function Profile() {
  const { profile, signOut, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    house_number: profile?.house_number || "",
    street_name: profile?.street_name || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zip_code: profile?.zip_code || "",
  });

  const handleEdit = () => {
    setFormData({
      name: profile?.name || "",
      phone: profile?.phone || "",
      house_number: profile?.house_number || "",
      street_name: profile?.street_name || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip_code: profile?.zip_code || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Check if phone number changed and reset verification if so
      const phoneChanged = formData.phone !== profile?.phone;

      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          phone: formData.phone || null,
          house_number: formData.house_number || null,
          street_name: formData.street_name || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          // Reset phone verification if phone number changed
          ...(phoneChanged && { phone_verified: false, notify_by_sms: false }),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      if (phoneChanged && formData.phone) {
        toast.info("Please verify your new phone number");
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getAddress = () => {
    if (profile?.house_number && profile?.street_name) {
      let address = `${profile.house_number} ${profile.street_name}`;
      if (profile.city) address += `, ${profile.city}`;
      if (profile.state) address += `, ${profile.state}`;
      if (profile.zip_code) address += ` ${profile.zip_code}`;
      return address;
    }
    if (profile?.unit_number) {
      return `Unit ${profile.unit_number}`;
    }
    return null;
  };

  return (
    <AppLayout>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-foreground'>Profile</h1>
          {!isEditing && (
            <Button variant='outline' size='sm' onClick={handleEdit}>
              <Pencil className='h-4 w-4 mr-2' />
              Edit
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className='flex items-center gap-4'>
              <div className='h-16 w-16 rounded-full bg-secondary flex items-center justify-center'>
                <span className='text-2xl font-bold text-secondary-foreground'>
                  {(isEditing ? formData.name : profile?.name)
                    ?.charAt(0)
                    .toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <CardTitle>
                  {isEditing
                    ? formData.name || "User"
                    : profile?.name || "User"}
                </CardTitle>
                <p className='text-sm text-muted-foreground'>
                  {isAdmin ? "Administrator" : "Resident"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {isEditing ? (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Full Name</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='Your full name'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone Number</Label>
                  <Input
                    id='phone'
                    type='tel'
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder='(555) 123-4567'
                  />
                  {formData.phone !== profile?.phone && formData.phone && (
                    <p className='text-xs text-muted-foreground'>
                      You'll need to verify your new phone number
                    </p>
                  )}
                </div>

                <div className='border-t pt-4'>
                  <p className='text-sm font-medium mb-3'>Address</p>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-2'>
                      <Label htmlFor='house_number'>House #</Label>
                      <Input
                        id='house_number'
                        value={formData.house_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            house_number: e.target.value,
                          })
                        }
                        placeholder='123'
                      />
                    </div>
                    <div className='space-y-2 col-span-1'>
                      <Label htmlFor='street_name'>Street</Label>
                      <Input
                        id='street_name'
                        value={formData.street_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            street_name: e.target.value,
                          })
                        }
                        placeholder='Main St'
                      />
                    </div>
                  </div>
                  <div className='grid grid-cols-3 gap-3 mt-3'>
                    <div className='space-y-2'>
                      <Label htmlFor='city'>City</Label>
                      <Input
                        id='city'
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        placeholder='City'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='state'>State</Label>
                      <Input
                        id='state'
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        placeholder='TX'
                        maxLength={2}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='zip_code'>ZIP</Label>
                      <Input
                        id='zip_code'
                        value={formData.zip_code}
                        onChange={(e) =>
                          setFormData({ ...formData, zip_code: e.target.value })
                        }
                        placeholder='12345'
                      />
                    </div>
                  </div>
                </div>

                <div className='flex gap-2 pt-2'>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className='flex-1'>
                    {isSaving ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                      <Save className='h-4 w-4 mr-2' />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    variant='outline'
                    onClick={handleCancel}
                    disabled={isSaving}>
                    <X className='h-4 w-4 mr-2' />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className='flex items-center gap-3 text-sm'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <span>{profile?.email}</span>
                </div>
                {profile?.phone ? (
                  <div className='flex items-center gap-3 text-sm'>
                    <Phone className='h-4 w-4 text-muted-foreground' />
                    <span>{profile.phone}</span>
                  </div>
                ) : (
                  <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                    <Phone className='h-4 w-4' />
                    <span className='italic'>No phone number added</span>
                  </div>
                )}
                {getAddress() ? (
                  <div className='flex items-center gap-3 text-sm'>
                    <MapPin className='h-4 w-4 text-muted-foreground' />
                    <span>{getAddress()}</span>
                  </div>
                ) : (
                  <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                    <MapPin className='h-4 w-4' />
                    <span className='italic'>No address added</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        {profile && (
          <NotificationPreferences
            profile={{
              email: profile.email,
              phone: profile.phone,
              email_verified: profile.email_verified,
              phone_verified: profile.phone_verified,
              notify_by_email: profile.notify_by_email,
              notify_by_sms: profile.notify_by_sms,
              user_id: profile.user_id,
            }}
          />
        )}

        <Button variant='outline' className='w-full' onClick={signOut}>
          <LogOut className='mr-2 h-4 w-4' />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
