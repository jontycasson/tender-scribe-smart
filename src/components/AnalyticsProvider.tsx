import { useEffect } from 'react';
import { initializeAnalytics } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  useEffect(() => {
    // Initialize analytics when the component mounts
    initializeAnalytics();
  }, []);

  return <>{children}</>;
};