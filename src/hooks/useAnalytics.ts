import { useCallback, useEffect } from 'react';

// Google Analytics event tracking
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Track page views
export const usePageTracking = () => {
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-E6HW4ESXQT', {
        page_path: window.location.pathname,
      });
    }
  }, []);
};

// Track custom events
export const useAnalytics = () => {
  const trackEvent = useCallback((action: string, category: string, label?: string, value?: number) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  }, []);

  const trackPageView = useCallback((pageName: string) => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-E6HW4ESXQT', {
        page_title: pageName,
        page_path: window.location.pathname,
      });
    }
  }, []);

  const trackUserAction = useCallback((action: string, details?: Record<string, any>) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', action, {
        event_category: 'user_interaction',
        ...details,
      });
    }
  }, []);

  const trackTenderAction = useCallback((action: string, tenderId?: string) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', action, {
        event_category: 'tender_management',
        tender_id: tenderId,
      });
    }
  }, []);

  const trackDemoUsage = useCallback((companyName: string) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'demo_submission', {
        event_category: 'conversion',
        event_label: companyName,
      });
    }
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackTenderAction,
    trackDemoUsage,
  };
};