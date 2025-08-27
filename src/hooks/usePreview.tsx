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
    const params = new URLSearchParams(searchParams);
    
    if (previewState.homepageVariant !== defaultState.homepageVariant) {
      params.set('variant', previewState.homepageVariant);
    } else {
      params.delete('variant');
    }
    
    if (previewState.dashboardLayout !== defaultState.dashboardLayout) {
      params.set('layout', previewState.dashboardLayout);
    } else {
      params.delete('layout');
    }
    
    if (previewState.showPreviewPanel) {
      params.set('preview', 'true');
    } else {
      params.delete('preview');
    }
    
    setSearchParams(params, { replace: true });
    
    // Safe localStorage write
    try {
      localStorage.setItem('lovable-preview-state', JSON.stringify(previewState));
    } catch (error) {
      console.warn('Failed to save preview state to localStorage:', error);
    }
  }, [previewState, setSearchParams]);

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
    try {
      localStorage.removeItem('lovable-preview-state');
    } catch (error) {
      console.warn('Failed to remove preview state from localStorage:', error);
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