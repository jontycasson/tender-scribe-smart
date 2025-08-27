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
    // Initialize from URL params or localStorage
    const urlVariant = searchParams.get('variant') as PreviewVariant;
    const urlLayout = searchParams.get('layout') as DashboardLayout;
    const showPanel = searchParams.get('preview') === 'true';
    
    const stored = localStorage.getItem('lovable-preview-state');
    const storedState = stored ? JSON.parse(stored) : {};
    
    return {
      homepageVariant: urlVariant || storedState.homepageVariant || defaultState.homepageVariant,
      dashboardLayout: urlLayout || storedState.dashboardLayout || defaultState.dashboardLayout,
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
    localStorage.setItem('lovable-preview-state', JSON.stringify(previewState));
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
    localStorage.removeItem('lovable-preview-state');
  };

  return {
    ...previewState,
    updateHomepageVariant,
    updateDashboardLayout,
    togglePreviewPanel,
    resetToDefaults
  };
};