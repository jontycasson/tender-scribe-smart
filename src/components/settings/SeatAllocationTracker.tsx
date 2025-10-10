import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface SeatUsage {
  plan_name: string;
  seat_limit: number;
  seats_used: number;
  seats_available: number;
  is_at_limit: boolean;
}

export function SeatAllocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchSeatUsage();
  }, [user]);

  const fetchSeatUsage = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's company ID
      const { data: profileData, error: profileError } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        // Check if user is a member of a company
        const { data: memberData, error: memberError } = await supabase
          .from('company_members')
          .select('company_profile_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError) throw memberError;
        
        if (memberData) {
          setCompanyId(memberData.company_profile_id);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setCompanyId(profileData.id);
      }

      // Get seat usage
      const companyIdToUse = profileData?.id || companyId;
      if (!companyIdToUse) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_company_seat_usage', {
        p_company_id: companyIdToUse
      });

      if (error) throw error;
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const usage = data as Record<string, any>;
        setSeatUsage({
          plan_name: String(usage.plan_name || 'Solo'),
          seat_limit: Number(usage.seat_limit || 1),
          seats_used: Number(usage.seats_used || 0),
          seats_available: Number(usage.seats_available || 0),
          is_at_limit: Boolean(usage.is_at_limit)
        });
      }
    } catch (error: any) {
      console.error("Error fetching seat usage:", error);
      toast({
        title: "Error",
        description: "Failed to load seat allocation information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!seatUsage) {
    return null;
  }

  const usagePercent = (seatUsage.seats_used / seatUsage.seat_limit) * 100;
  const isNearLimit = usagePercent >= 80;

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Solo':
        return 'bg-gray-600';
      case 'Starter':
        return 'bg-blue-600';
      case 'Pro':
        return 'bg-purple-600';
      case 'Enterprise':
        return 'bg-amber-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <Card className={isNearLimit ? 'border-amber-500' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Seat Allocation</CardTitle>
          </div>
          <Badge className={getPlanColor(seatUsage.plan_name)}>
            {seatUsage.plan_name} Plan
          </Badge>
        </div>
        <CardDescription>
          Track your team size and available seats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Seats Used</span>
            <span className="font-semibold">
              {seatUsage.seats_used} / {seatUsage.seat_limit}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
        </div>

        {seatUsage.is_at_limit && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Seat limit reached
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You've used all {seatUsage.seat_limit} seats on your {seatUsage.plan_name} plan. 
                Upgrade to add more team members.
              </p>
            </div>
          </div>
        )}

        {isNearLimit && !seatUsage.is_at_limit && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Almost at capacity
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                You're using {seatUsage.seats_used} of {seatUsage.seat_limit} seats. 
                Consider upgrading to accommodate more team members.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Available: </span>
            <span className="font-semibold text-primary">
              {seatUsage.seats_available} {seatUsage.seats_available === 1 ? 'seat' : 'seats'}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/pricing">
              View Plans
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
