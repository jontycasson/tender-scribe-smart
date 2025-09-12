import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // Get the Google Analytics ID from Supabase edge function
        const { data, error } = await supabase.functions.invoke('get-analytics-config');
        
        if (error) {
          console.warn('Failed to load analytics config:', error);
          return;
        }

        const { analytics_id } = data;
        
        if (analytics_id && analytics_id !== 'G-XXXXXXXXXX') {
          // Update the existing gtag script with the real ID
          const existingScript = document.querySelector('script[src*="googletagmanager.com/gtag/js"]') as HTMLScriptElement;
          if (existingScript) {
            existingScript.src = `https://www.googletagmanager.com/gtag/js?id=${analytics_id}`;
          }

          // Initialize gtag with the real ID
          if (typeof window.gtag === 'function') {
            window.gtag('config', analytics_id, {
              page_path: window.location.pathname,
            });
          }
          
          setAnalyticsLoaded(true);
        }
      } catch (error) {
        console.warn('Analytics initialization failed:', error);
      }
    };

    loadAnalytics();
  }, []);

  return <>{children}</>;
};