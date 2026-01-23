import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GateKprLogo } from "@/components/ui/GateKprLogo";
import {
  Building2,
  MapPin,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { PLANS } from "@/lib/subscriptionPlans";

const STEPS = [
  { id: 1, title: "Community Info", icon: Building2 },
  { id: 2, title: "Location", icon: MapPin },
  { id: 3, title: "Choose Plan", icon: CreditCard },
];

export default function HoaOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Community Info
  const [communityName, setCommunityName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [estimatedHomes, setEstimatedHomes] = useState("");

  // Step 2: Location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Step 3: Plan selection
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");

  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // If user already has an HOA, redirect
  if (profile?.hoa_id) {
    navigate("/admin", { replace: true });
    return null;
  }

  const createHoa = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Create the HOA
      const { data: hoa, error: hoaError } = await supabase
        .from("hoas")
        .insert({
          name: communityName,
          address: `${address}, ${city}, ${state} ${zipCode}`,
          welcome_message: welcomeMessage || null,
          billing_email: user.email,
        })
        .select()
        .single();

      if (hoaError) throw hoaError;

      // Update user's profile to link to new HOA
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          hoa_id: hoa.id,
          status: "active",
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Add admin role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "admin",
      });

      if (roleError) throw roleError;

      return hoa;
    },
    onSuccess: async (hoa) => {
      // Invalidate queries to refresh profile
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      // Now redirect to subscription checkout
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke(
          "create-subscription",
          {
            body: {
              planId: selectedPlan,
              hoaId: hoa.id,
              hoaName: hoa.name,
              billingEmail: user?.email,
            },
          }
        );

        if (error) throw error;

        if (data?.url) {
          // Redirect to Stripe checkout
          window.location.href = data.url;
        } else {
          // If no URL, go to admin dashboard
          navigate("/admin");
        }
      } catch (error) {
        console.error("Subscription error:", error);
        toast({
          title: "HOA Created",
          description:
            "Your community was created. You can subscribe later from Settings.",
        });
        navigate("/admin/settings");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create HOA",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return communityName.trim().length >= 2 && estimatedHomes;
      case 2:
        return address.trim() && city.trim() && state.trim() && zipCode.trim();
      case 3:
        return selectedPlan;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - create HOA and subscribe
      createHoa.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getSuggestedPlan = () => {
    const homes = parseInt(estimatedHomes) || 0;
    if (homes <= 100) return "starter";
    if (homes <= 200) return "standard";
    return "plus";
  };

  return (
    <div className='min-h-screen bg-background p-4 md:p-8'>
      <div className='max-w-3xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='flex justify-center mb-4'>
            <div className='flex items-center gap-2'>
              <GateKprLogo size='lg' />
              <span className='text-2xl font-bold text-foreground'>
                GateKpr
              </span>
            </div>
          </div>
          <h1 className='text-2xl font-bold text-foreground mb-2'>
            Set Up Your Community
          </h1>
          <p className='text-muted-foreground'>
            Let's get your HOA up and running in just a few steps
          </p>
        </div>

        {/* Progress */}
        <div className='mb-8'>
          <div className='flex justify-between mb-2'>
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 text-sm ${
                  currentStep >= step.id
                    ? "text-secondary"
                    : "text-muted-foreground"
                }`}>
                <div
                  className={`p-1.5 rounded-full ${
                    currentStep >= step.id ? "bg-secondary/20" : "bg-muted"
                  }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className='h-4 w-4 text-secondary' />
                  ) : (
                    <step.icon className='h-4 w-4' />
                  )}
                </div>
                <span className='hidden sm:inline'>{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className='h-2' />
        </div>

        {/* Step Content */}
        <Card>
          {/* Step 1: Community Info */}
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Building2 className='h-5 w-5 text-secondary' />
                  Community Information
                </CardTitle>
                <CardDescription>
                  Tell us about your HOA community
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='communityName'>Community Name *</Label>
                  <Input
                    id='communityName'
                    placeholder='e.g., Sunset Valley HOA'
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='estimatedHomes'>
                    Estimated Number of Homes *
                  </Label>
                  <Select
                    value={estimatedHomes}
                    onValueChange={setEstimatedHomes}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select range' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='25'>1-25 homes</SelectItem>
                      <SelectItem value='50'>26-50 homes</SelectItem>
                      <SelectItem value='100'>51-100 homes</SelectItem>
                      <SelectItem value='150'>101-150 homes</SelectItem>
                      <SelectItem value='200'>151-200 homes</SelectItem>
                      <SelectItem value='300'>201-300 homes</SelectItem>
                      <SelectItem value='400'>300+ homes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-muted-foreground'>
                    This helps us recommend the right plan for your community
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='welcomeMessage'>
                    Welcome Message (optional)
                  </Label>
                  <Textarea
                    id='welcomeMessage'
                    placeholder="Welcome to our community! We're glad to have you..."
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                  />
                  <p className='text-xs text-muted-foreground'>
                    This message will be shown to new residents when they join
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <MapPin className='h-5 w-5 text-secondary' />
                  Community Location
                </CardTitle>
                <CardDescription>
                  Where is your community located?
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='address'>Street Address *</Label>
                  <Input
                    id='address'
                    placeholder='123 Main St'
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='city'>City *</Label>
                  <Input
                    id='city'
                    placeholder='Los Angeles'
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='state'>State *</Label>
                    <Input
                      id='state'
                      placeholder='CA'
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='zipCode'>ZIP Code *</Label>
                    <Input
                      id='zipCode'
                      placeholder='90210'
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Choose Plan */}
          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <CreditCard className='h-5 w-5 text-secondary' />
                  Choose Your Plan
                </CardTitle>
                <CardDescription>
                  Select the plan that fits your community. You can upgrade
                  anytime.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4'>
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const isSuggested = getSuggestedPlan() === plan.id;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-secondary bg-secondary/5"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}>
                        {isSuggested && (
                          <div className='absolute -top-2 right-4 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full font-medium'>
                            Recommended
                          </div>
                        )}

                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-1'>
                              <h3 className='font-semibold'>{plan.name}</h3>
                              <span className='text-xs text-muted-foreground'>
                                ({plan.homes} homes)
                              </span>
                            </div>
                            <ul className='text-sm text-muted-foreground space-y-1'>
                              {plan.features.slice(0, 3).map((feature, i) => (
                                <li
                                  key={i}
                                  className='flex items-center gap-1.5'>
                                  <Check className='h-3 w-3 text-green-500' />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className='text-right'>
                            <div className='flex items-baseline gap-0.5'>
                              <DollarSign className='h-4 w-4 text-muted-foreground' />
                              <span className='text-2xl font-bold'>
                                {plan.price}
                              </span>
                            </div>
                            <span className='text-xs text-muted-foreground'>
                              /month
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className='absolute top-4 left-4'>
                            <CheckCircle className='h-5 w-5 text-secondary' />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className='text-xs text-muted-foreground text-center'>
                  You'll be redirected to our secure payment provider after
                  clicking Continue
                </p>
              </CardContent>
            </>
          )}

          <CardFooter className='flex justify-between gap-4'>
            <Button
              variant='outline'
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading || createHoa.isPending}>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || isLoading || createHoa.isPending}>
              {(isLoading || createHoa.isPending) && (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              )}
              {currentStep === STEPS.length ? "Create & Subscribe" : "Continue"}
              {currentStep < STEPS.length && (
                <ArrowRight className='h-4 w-4 ml-2' />
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Help text */}
        <p className='text-center text-sm text-muted-foreground mt-6'>
          Need help? Contact us at{" "}
          <a
            href='mailto:support@gatekpr.com'
            className='text-secondary hover:underline'>
            support@gatekpr.com
          </a>
        </p>
      </div>
    </div>
  );
}
