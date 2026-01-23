import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Building2, MessageSquareText } from "lucide-react";
import { BillingSection } from "@/components/billing/BillingSection";
import { FeatureSettings } from "@/components/admin/FeatureSettings";
import { QRCodeGenerator } from "@/components/admin/QRCodeGenerator";

export default function AdminSettings() {
  const { effectiveHoaId, isSuperAdmin, currentHoa } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    welcomeMessage: "",
  });

  // Handle subscription callbacks
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      toast.success("Subscription activated successfully! Welcome to Gatekpr.");
      queryClient.invalidateQueries({ queryKey: ["hoa-subscription"] });
    } else if (subscriptionStatus === "canceled") {
      toast.info("Subscription setup was canceled.");
    }
  }, [searchParams, queryClient]);

  // Update form data when currentHoa changes
  useEffect(() => {
    if (currentHoa) {
      setFormData({
        name: currentHoa.name,
        address: currentHoa.address || "",
        welcomeMessage: currentHoa.welcome_message || "",
      });
    }
  }, [currentHoa]);

  const updateHoa = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("hoas")
        .update({
          name: formData.name,
          address: formData.address || null,
          welcome_message: formData.welcomeMessage || null,
        })
        .eq("id", effectiveHoaId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hoa"] });
      toast.success("Settings updated");
    },
    onError: () => toast.error("Failed to update settings"),
  });

  // Show prompt to select HOA if super admin hasn't selected one
  if (isSuperAdmin && !effectiveHoaId) {
    return (
      <AppLayout adminOnly>
        <div className='space-y-6'>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>Settings</h1>
            <p className='text-muted-foreground'>
              Manage your HOA configuration
            </p>
          </div>
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <Building2 className='h-12 w-12 text-muted-foreground mb-4' />
              <h2 className='text-lg font-medium mb-2'>Select an HOA</h2>
              <p className='text-muted-foreground text-center'>
                Use the HOA dropdown in the sidebar to select a community first.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout adminOnly>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Settings</h1>
          <p className='text-muted-foreground'>Manage your HOA configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Community Information</CardTitle>
            <CardDescription>Basic details about your HOA</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Community Name</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='Sunset Valley HOA'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='address'>Address</Label>
              <Input
                id='address'
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder='123 Main Street, City, State 12345'
              />
            </div>
            <Button
              onClick={() => updateHoa.mutate()}
              disabled={updateHoa.isPending}>
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Welcome Message Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <MessageSquareText className='h-5 w-5' />
              Welcome Message
            </CardTitle>
            <CardDescription>
              Customize the welcome message new residents see when they first
              join
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='welcomeMessage'>Message for New Residents</Label>
              <Textarea
                id='welcomeMessage'
                value={formData.welcomeMessage}
                onChange={(e) =>
                  setFormData({ ...formData, welcomeMessage: e.target.value })
                }
                placeholder='Welcome to our community! Here you can pay dues, submit maintenance requests, reserve community spaces, and stay updated with announcements.'
                rows={5}
                className='resize-none'
              />
              <p className='text-xs text-muted-foreground'>
                This message appears in the onboarding tour when new residents
                first access the app.
              </p>
            </div>
            <Button
              onClick={() => updateHoa.mutate()}
              disabled={updateHoa.isPending}>
              Save Welcome Message
            </Button>
          </CardContent>
        </Card>

        {/* QR Code Generator */}
        <QRCodeGenerator />

        {/* Feature Settings */}
        <FeatureSettings />

        {/* Billing Section */}
        <BillingSection />
      </div>
    </AppLayout>
  );
}
