import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CreditCard, Check, Loader2, ExternalLink, Crown } from "lucide-react";
import { format } from "date-fns";
import { PLANS } from "@/lib/subscriptionPlans";

export function BillingSection() {
  const { effectiveHoaId, isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["hoa-subscription", effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoa_subscriptions")
        .select("*")
        .eq("hoa_id", effectiveHoaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  // Fetch HOA details for subscription
  const { data: hoa } = useQuery({
    queryKey: ["hoa-billing", effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoas")
        .select("id, name, billing_email")
        .eq("id", effectiveHoaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  const handleSubscribe = async (planId: string) => {
    if (!effectiveHoaId || !hoa) {
      toast.error("Please select an HOA first");
      return;
    }

    setIsLoading(planId);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-subscription",
        {
          body: {
            planId,
            hoaId: effectiveHoaId,
            hoaName: hoa.name,
            billingEmail: hoa.billing_email,
          },
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to start subscription. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!effectiveHoaId) return;

    setIsLoading("manage");

    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-subscription",
        {
          body: { hoaId: effectiveHoaId },
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Manage subscription error:", error);
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className='bg-green-100 text-green-800'>Active</Badge>;
      case "past_due":
        return (
          <Badge className='bg-yellow-100 text-yellow-800'>Past Due</Badge>
        );
      case "canceled":
        return <Badge className='bg-red-100 text-red-800'>Canceled</Badge>;
      default:
        return <Badge variant='secondary'>{status}</Badge>;
    }
  };

  if (subscriptionLoading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </CardContent>
      </Card>
    );
  }

  // Show current subscription if exists
  if (subscription) {
    const currentPlan = PLANS.find((p) => p.id === subscription.plan_name);

    return (
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Crown className='h-5 w-5 text-yellow-500' />
                Subscription
              </CardTitle>
              <CardDescription>Your current Gatekpr plan</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='rounded-lg border p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-semibold text-lg'>
                  {currentPlan?.name || subscription.plan_name} Plan
                </p>
                <p className='text-sm text-muted-foreground'>
                  ${currentPlan?.price || 0}/month
                </p>
              </div>
            </div>

            {subscription.current_period_end && (
              <p className='text-sm text-muted-foreground'>
                {subscription.status === "canceled"
                  ? "Access until"
                  : "Next billing date"}
                :{" "}
                {format(
                  new Date(subscription.current_period_end),
                  "MMM d, yyyy"
                )}
              </p>
            )}
          </div>

          <Button
            onClick={handleManageSubscription}
            className='w-full'
            disabled={isLoading === "manage"}>
            {isLoading === "manage" ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <ExternalLink className='mr-2 h-4 w-4' />
            )}
            Manage Subscription
          </Button>
          <p className='text-xs text-muted-foreground text-center'>
            Update payment method, view invoices, or cancel
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show plan selection for new subscriptions
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Subscribe to Gatekpr
          </CardTitle>
          <CardDescription>
            Choose a plan based on your community size. Pricing scales as your
            community grows.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='grid gap-4 md:grid-cols-3'>
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className='relative overflow-hidden flex flex-col h-full'>
            {plan.id === "standard" && (
              <div className='absolute top-0 right-0 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium'>
                Popular
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className='flex items-baseline gap-1'>
                <span className='text-3xl font-bold'>${plan.price}</span>
                <span className='text-muted-foreground'>/month</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className='flex-grow space-y-4'>
              <ul className='space-y-2'>
                {plan.features.map((feature, i) => (
                  <li key={i} className='flex items-start gap-2 text-sm'>
                    <Check className='h-4 w-4 text-green-500 mt-0.5 shrink-0' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className='p-6 pt-0'>
              <Button
                className='w-full'
                variant={plan.id === "standard" ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading !== null}>
                {isLoading === plan.id ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : null}
                Subscribe Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className='text-center text-sm text-muted-foreground'>
        All plans include full access to features. Cancel anytime.
      </p>
    </div>
  );
}
