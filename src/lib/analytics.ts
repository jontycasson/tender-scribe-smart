// Analytics configuration and utilities

// Initialize Google Analytics with the tracking ID
export const initializeAnalytics = () => {
  const GA_TRACKING_ID = 'G-E6HW4ESXQT';
  
  // Update the gtag config with the tracking ID
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: window.location.pathname,
    });
  }
};

// Common analytics events
export const AnalyticsEvents = {
  // Page navigation
  PAGE_VIEW: 'page_view',
  
  // User actions
  SIGN_UP_STARTED: 'sign_up_started',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',
  
  // Tender management
  TENDER_UPLOAD: 'tender_upload',
  TENDER_PROCESS_START: 'tender_process_start',
  TENDER_PROCESS_COMPLETE: 'tender_process_complete',
  TENDER_EXPORT: 'tender_export',
  TENDER_DELETE: 'tender_delete',
  
  // Demo usage
  DEMO_STARTED: 'demo_started',
  DEMO_COMPLETED: 'demo_completed',
  DEMO_LIMIT_REACHED: 'demo_limit_reached',
  
  // Company profile
  COMPANY_PROFILE_CREATED: 'company_profile_created',
  COMPANY_PROFILE_UPDATED: 'company_profile_updated',
  
  // Navigation
  CTA_CLICKED: 'cta_clicked',
  EXTERNAL_LINK_CLICKED: 'external_link_clicked',
} as const;

// Track conversion funnel steps
export const trackConversionStep = (step: string, additionalData?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion_step', {
      event_category: 'conversion_funnel',
      step_name: step,
      ...additionalData,
    });
  }
};

// Track feature usage
export const trackFeatureUsage = (feature: string, action: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'feature_usage', {
      event_category: 'product_usage',
      feature_name: feature,
      action: action,
    });
  }
};