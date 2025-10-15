import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Crown, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

interface Plan {
  name: string;
  seats: number;
  price: string;
  description: string;
}

const availablePlans: Plan[] = [
  { name: 'Solo', seats: 1, price: '£94.99/month', description: 'For freelancers & micro-SMEs' },
  { name: 'Starter', seats: 2, price: '£113.99/month', description: 'For small teams' },
  { name: 'Pro', seats: 5, price: '£136.99/month', description: 'For growing teams' },
  { name: 'Enterprise', seats: 10, price: '£164.99/month', description: 'For scale-ups & larger teams' },
];

export function PlanManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Solo');
  const [selectedPlan, setSelectedPlan] = useState<string>('Solo');
  const [isOwner, setIsOwner] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [isComplimentary, setIsComplimentary] = useState(false);

  useEffect(() => {
    fetchCurrentPlan();
  }, [user]);

  const fetchCurrentPlan = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('plan_name, user_id, stripe_subscription_id, is_complimentary')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsOwner(true);
        setCurrentPlan(data.plan_name || 'Solo');
        setSelectedPlan(data.plan_name || 'Solo');
        setHasStripeSubscription(!!data.stripe_subscription_id);
        setIsComplimentary(data.is_complimentary || false);
      } else {
        setIsOwner(false);
      }
    } catch (error: any) {
      console.error("Error fetching plan:", error);
      toast({
        title: "Error",
        description: "Failed to load plan information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (selectedPlan === currentPlan) {
      toast({
        title: "No changes",
        description: "You're already on this plan",
      });
      return;
    }

    const selectedPlanData = availablePlans.find(p => p.name === selectedPlan);
    if (!selectedPlanData) return;

    setUpdating(true);
    try {
      // Use Stripe checkout for plan changes
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan_name: selectedPlan, billing_period: "monthly" },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleManageBilling = async () => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal");

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error opening portal:", error);
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Management</CardTitle>
          <CardDescription>Only company owners can manage the plan</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Plan Management
            </CardTitle>
            <CardDescription>
              Manage your subscription and seat allocation
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            Current: {currentPlan}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Select Plan</Label>
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
            <div className="space-y-3">
              {availablePlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedPlan === plan.name
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlan(plan.name)}
                >
                  <RadioGroupItem value={plan.name} id={plan.name} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={plan.name} className="font-semibold cursor-pointer flex items-center gap-2">
                        {plan.name}
                        {plan.name === currentPlan && (
                          <Badge variant="outline" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </Label>
                      <span className="font-semibold text-primary">{plan.price}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="text-sm font-medium">
                      {plan.seats} {plan.seats === 1 ? 'seat' : 'seats'} included
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/pricing">View Full Details</Link>
            </Button>
            {hasStripeSubscription && (
              <Button variant="outline" onClick={handleManageBilling} disabled={updating}>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>
          <Button 
            onClick={handleUpdatePlan}
            disabled={updating || selectedPlan === currentPlan || isComplimentary}
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : selectedPlan === currentPlan ? (
              'Current Plan'
            ) : (
              'Upgrade Plan'
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p className="font-medium mb-1">Note:</p>
          <ul className="list-disc list-inside space-y-1">
            {isComplimentary ? (
              <li>You have complimentary access. Contact support to make changes.</li>
            ) : (
              <>
                <li>Plan changes are processed securely through Stripe</li>
                <li>You can manage billing and view invoices in the billing portal</li>
                <li>Changes take effect immediately upon payment</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
