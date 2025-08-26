
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExportButtonProps {
  tenderId: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ tenderId }) => {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async (format: 'docx' | 'pdf') => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-tender', {
        body: JSON.stringify({ tenderId, format }),
      });

      if (error) throw error;

      // Create a blob and download the file
      const blob = new Blob([data], {
        type: format === 'docx' 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tender_responses.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Tender responses exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message || "Failed to export tender responses",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => handleExport('docx')}
        disabled={isExporting}
      >
        <Download className="w-4 h-4 mr-2" />
        Export DOCX
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
      >
        <Download className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
};
