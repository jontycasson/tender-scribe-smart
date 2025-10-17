
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import jsPDF from "jspdf";

interface ExportButtonProps {
  tenderId: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ tenderId }) => {
  const [isExporting, setIsExporting] = React.useState(false);

  const generateDOCX = async (exportData: any) => {
    const paragraphs = [
      new Paragraph({
        children: [new TextRun({ text: exportData.title, bold: true, size: 32 })],
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({ children: [new TextRun("")] }), // Empty line
    ];

    exportData.items.forEach((item: any) => {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `${item.questionNumber}. ${item.question}`, bold: true })],
        }),
        new Paragraph({ children: [new TextRun("")] }), // Empty line
        new Paragraph({
          children: [new TextRun(item.answer || 'No answer provided')],
        }),
        new Paragraph({ children: [new TextRun("")] }), // Empty line
      );
    });

    const doc = new Document({
      sections: [{ properties: {}, children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  const generatePDF = (exportData: any) => {
    const pdf = new jsPDF();
    
    // Title
    pdf.setFontSize(18);
    pdf.text(exportData.title, 20, 30);
    
    let yPosition = 50;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    
    exportData.items.forEach((item: any) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 30;
      }
      
      // Question
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      const questionLines = pdf.splitTextToSize(`${item.questionNumber}. ${item.question}`, 170);
      pdf.text(questionLines, margin, yPosition);
      yPosition += questionLines.length * 7 + 5;
      
      // Answer
      pdf.setFont(undefined, 'normal');
      const answerText = item.answer || 'No answer provided';
      const answerLines = pdf.splitTextToSize(answerText, 170);
      pdf.text(answerLines, margin, yPosition);
      yPosition += answerLines.length * 5 + 15;
    });
    
    return pdf.output('blob');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'docx' | 'pdf') => {
    setIsExporting(true);
    try {
      const { data: rawData, error } = await supabase.functions.invoke('export-tender', {
        body: { tenderId, format },
      });

      if (error) throw error;

      console.log('[EXPORT] Raw data received:', rawData);

      // The edge function returns the data directly, no need to parse
      const exportData = rawData;

      if (!exportData || !exportData.title || !exportData.items) {
        throw new Error('Invalid export data structure');
      }

      let blob: Blob;
      let filename: string;

      if (format === 'docx') {
        blob = await generateDOCX(exportData);
        filename = `${exportData.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.docx`;
      } else {
        blob = generatePDF(exportData);
        filename = `${exportData.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.pdf`;
      }

      downloadFile(blob, filename);

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
