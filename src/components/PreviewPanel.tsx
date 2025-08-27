import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, X, RotateCcw, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePreview, PreviewVariant } from "@/hooks/usePreview";

interface PreviewPanelProps {
  currentPage: 'homepage' | 'dashboard' | 'other';
}

export const PreviewPanel = ({ currentPage }: PreviewPanelProps) => {
  const navigate = useNavigate();
  const {
    homepageVariant,
    showPreviewPanel,
    updateHomepageVariant,
    togglePreviewPanel,
    resetToDefaults
  } = usePreview();

  const applyToHomepage = () => {
    navigate('/');
  };

  if (!showPreviewPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={togglePreviewPanel}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm shadow-lg"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Mode
        </Button>
      </div>
    );
  }

  const homepageVariants: { key: PreviewVariant; label: string; description: string }[] = [
    { key: 'classic', label: 'Classic', description: 'Original centered hero layout' },
    { key: 'document-first', label: 'Document-First', description: 'Focus on document upload flow' },
    { key: 'split-hero', label: 'Split Hero', description: 'Side-by-side content layout' }
  ];

  return (
    <div className="fixed bottom-4 right-4 w-80 z-50">
      <Card className="bg-background/95 backdrop-blur-sm shadow-xl border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Preview Mode
            </CardTitle>
            <div className="flex gap-1">
              <Button
                onClick={resetToDefaults}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                onClick={togglePreviewPanel}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">Layout Variant</span>
              <Badge variant="secondary" className="text-xs">
                {homepageVariants.find(v => v.key === homepageVariant)?.label}
              </Badge>
            </div>
            <div className="space-y-1">
              {homepageVariants.map((variant) => (
                <Button
                  key={variant.key}
                  onClick={() => updateHomepageVariant(variant.key)}
                  variant={homepageVariant === variant.key ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                >
                  <div className="text-left">
                    <div className="font-medium">{variant.label}</div>
                    <div className="text-xs text-muted-foreground">{variant.description}</div>
                  </div>
                </Button>
              ))}
            </div>
            <Button 
              onClick={applyToHomepage}
              className="w-full mt-3 text-xs h-8"
              size="sm"
            >
              <ArrowRight className="h-3 w-3 mr-2" />
              Apply to Homepage
            </Button>
          </div>

          {currentPage === 'other' && (
            <div className="text-xs text-muted-foreground text-center py-2">
              Navigate to Homepage to preview layouts
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};