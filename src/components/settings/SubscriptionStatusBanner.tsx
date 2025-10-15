import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle, CheckCircle2, Gift } from "lucide-react";
import { Link } from "react-router-dom";

interface SubscriptionStatus {
  subscription_status: string;
  is_complimentary: boolean;
  is_active: boolean;
  plan_name: string;
  billing_period: string | null;
  trial_days_remaining: number | null;
  trial_tenders_used: number;
  trial_tender_limit: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function SubscriptionStatusBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_subscription_status');
      if (error) throw error;
      setStatus(data as unknown as SubscriptionStatus);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) return null;

  // Complimentary access
  if (status.is_complimentary && status.subscription_status === 'complimentary') {
    return (
      <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
        <Gift className="h-4 w-4 text-purple-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-purple-900 dark:text-purple-200">
              You have complimentary <strong>{status.plan_name}</strong> access
            </span>
            <Badge variant="secondary" className="bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Active paid subscription
  if (status.subscription_status === 'active') {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-900 dark:text-green-200">
              <strong>{status.plan_name}</strong> plan active
              {status.billing_period && ` (${status.billing_period})`}
            </span>
          </div>
          <Link to="/settings">
            <Button variant="ghost" size="sm">Manage</Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial - near limit
  if (status.subscription_status === 'trial') {
    const tendersRemaining = status.trial_tender_limit - status.trial_tenders_used;
    const isNearLimit = tendersRemaining <= 2;
    const daysRemaining = status.trial_days_remaining || 0;
    const isExpiringSoon = daysRemaining <= 3;

    return (
      <Alert className={`${isNearLimit || isExpiringSoon ? 'border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800' : 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800'}`}>
        <AlertTriangle className={`h-4 w-4 ${isNearLimit || isExpiringSoon ? 'text-amber-600' : 'text-blue-600'}`} />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={isNearLimit || isExpiringSoon ? 'text-amber-900 dark:text-amber-200' : 'text-blue-900 dark:text-blue-200'}>
                <strong>Trial:</strong> {tendersRemaining} of {status.trial_tender_limit} tenders remaining
              </span>
              <Badge variant="outline" className="text-xs">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
              </Badge>
            </div>
            {isNearLimit && (
              <span className="text-xs text-amber-700 dark:text-amber-300">
                Upgrade now to continue processing tenders without limits
              </span>
            )}
          </div>
          <Link to="/pricing">
            <Button variant="default" size="sm">
              <Crown className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Expired, cancelled, or other inactive states
  if (!status.is_active) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your subscription is inactive. Upgrade to continue using TenderFlow.
          </span>
          <Link to="/pricing">
            <Button variant="default" size="sm">
              <Crown className="h-3 w-3 mr-1" />
              Upgrade Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
