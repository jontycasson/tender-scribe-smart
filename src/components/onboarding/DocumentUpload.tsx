import { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedDocument {
  id?: string;
  file_name: string;
  document_type: string;
  file_size: number;
  file_path?: string;
  file?: File;
}

interface DocumentUploadProps {
  companyProfileId?: string;
}

export const DocumentUpload = ({ companyProfileId }: DocumentUploadProps) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newDocuments: UploadedDocument[] = Array.from(files).map(file => ({
      file_name: file.name,
      document_type: 'other',
      file_size: file.size,
      file: file
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleTypeChange = (index: number, type: string) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, document_type: type } : doc
    ));
  };

  const handleRemove = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const doc of documents) {
        if (!doc.file) continue;

        // Upload to storage
        const filePath = `${user.id}/${Date.now()}_${doc.file_name}`;
        const { error: uploadError } = await supabase.storage
          .from('company-documents')
          .upload(filePath, doc.file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('company_documents')
          .insert({
            company_profile_id: companyProfileId,
            user_id: user.id,
            file_name: doc.file_name,
            file_path: filePath,
            file_type: doc.file.type,
            file_size: doc.file_size,
            document_type: doc.document_type,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: `${documents.length} document(s) uploaded successfully.`,
      });

      setDocuments([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="document-upload" className="text-base font-semibold">
          Upload Supporting Documents
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Upload policies, fact sheets, or other documents to help the AI generate more accurate responses.
        </p>
      </div>

      {!companyProfileId && (
        <div className="bg-muted/50 border border-border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            💡 Save your company profile first to enable document uploads
          </p>
        </div>
      )}

      <Card className={`border-2 border-dashed transition-colors ${!companyProfileId ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}`}>
        <label
          htmlFor="document-upload"
          className="flex flex-col items-center justify-center p-8 cursor-pointer"
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, TXT up to 10MB each
          </p>
          <input
            id="document-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            className="hidden"
            disabled={!companyProfileId}
          />
        </label>
      </Card>

      {documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                  
                  <div className="mt-2">
                    <Select
                      value={doc.document_type}
                      onValueChange={(value) => handleTypeChange(index, value)}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policy">Policy Document</SelectItem>
                        <SelectItem value="fact_sheet">Fact Sheet</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          <Button
            onClick={handleUpload}
            disabled={uploading || !companyProfileId}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${documents.length} Document${documents.length > 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
