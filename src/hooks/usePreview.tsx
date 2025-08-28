import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export type PreviewVariant = 'classic' | 'document-first' | 'split-hero';
export type DashboardLayout = 'tenders' | 'projects';

interface PreviewState {
  homepageVariant: PreviewVariant;
  dashboardLayout: DashboardLayout;
  showPreviewPanel: boolean;
}

const defaultState: PreviewState = {
  homepageVariant: 'classic',
  dashboardLayout: 'tenders',
  showPreviewPanel: false
};

export const usePreview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewState, setPreviewState] = useState<PreviewState>(() => {
    // Initialize from URL params or localStorage with error handling
    const urlVariant = searchParams.get('variant') as PreviewVariant;
    const urlLayout = searchParams.get('layout') as DashboardLayout;
    const showPanel = searchParams.get('preview') === 'true';
    
    // Validate URL parameters
    const validVariants: PreviewVariant[] = ['classic', 'document-first', 'split-hero'];
    const validLayouts: DashboardLayout[] = ['tenders', 'projects'];
    
    const safeUrlVariant = validVariants.includes(urlVariant) ? urlVariant : null;
    const safeUrlLayout = validLayouts.includes(urlLayout) ? urlLayout : null;
    
    // Safe localStorage parsing
    let storedState: Partial<PreviewState> = {};
    try {
      const stored = localStorage.getItem('lovable-preview-state');
      if (stored) {
        storedState = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to parse preview state from localStorage:', error);
      // Remove corrupted data
      try {
        localStorage.removeItem('lovable-preview-state');
      } catch (removeError) {
        console.warn('Failed to remove corrupted preview state:', removeError);
      }
    }
    
    return {
      homepageVariant: safeUrlVariant || storedState.homepageVariant || defaultState.homepageVariant,
      dashboardLayout: safeUrlLayout || storedState.dashboardLayout || defaultState.dashboardLayout,
      showPreviewPanel: showPanel || storedState.showPreviewPanel || defaultState.showPreviewPanel
    };
  });

  // Update URL and localStorage when state changes
  useEffect(() => {
    // Prevent unnecessary updates if state hasn't actually changed
    const params = new URLSearchParams(searchParams);
    let hasChanges = false;
    
    if (previewState.homepageVariant !== defaultState.homepageVariant) {
      if (params.get('variant') !== previewState.homepageVariant) {
        params.set('variant', previewState.homepageVariant);
        hasChanges = true;
      }
    } else {
      if (params.has('variant')) {
        params.delete('variant');
        hasChanges = true;
      }
    }
    
    if (previewState.dashboardLayout !== defaultState.dashboardLayout) {
      if (params.get('layout') !== previewState.dashboardLayout) {
        params.set('layout', previewState.dashboardLayout);
        hasChanges = true;
      }
    } else {
      if (params.has('layout')) {
        params.delete('layout');
        hasChanges = true;
      }
    }
    
    if (previewState.showPreviewPanel) {
      if (params.get('preview') !== 'true') {
        params.set('preview', 'true');
        hasChanges = true;
      }
    } else {
      if (params.has('preview')) {
        params.delete('preview');
        hasChanges = true;
      }
    }
    
    // Only update URL if there are actual changes
    if (hasChanges) {
      try {
        setSearchParams(params, { replace: true });
      } catch (error) {
        console.warn('Failed to update URL parameters:', error);
      }
    }
    
    // Safe localStorage write - only if we can access localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('lovable-preview-state', JSON.stringify(previewState));
      } catch (error) {
        console.warn('Failed to save preview state to localStorage:', error);
      }
    }
  }, [previewState, setSearchParams, searchParams]);

  const updateHomepageVariant = (variant: PreviewVariant) => {
    setPreviewState(prev => ({ ...prev, homepageVariant: variant }));
  };

  const updateDashboardLayout = (layout: DashboardLayout) => {
    setPreviewState(prev => ({ ...prev, dashboardLayout: layout }));
  };

  const togglePreviewPanel = () => {
    setPreviewState(prev => ({ ...prev, showPreviewPanel: !prev.showPreviewPanel }));
  };

  const resetToDefaults = () => {
    setPreviewState(defaultState);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('lovable-preview-state');
      } catch (error) {
        console.warn('Failed to remove preview state from localStorage:', error);
      }
    }
  };

  return {
    ...previewState,
    updateHomepageVariant,
    updateDashboardLayout,
    togglePreviewPanel,
    resetToDefaults
  };
};