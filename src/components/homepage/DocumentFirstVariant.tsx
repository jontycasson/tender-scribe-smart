import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ArrowRight, FileText, Users, Shield, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const DocumentFirstVariant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
      {/* Left Side - Upload Focus */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 py-12 bg-gradient-to-br from-primary/5 to-accent/10">
        <div className="max-w-xl">
          <div className="flex items-center mb-6">
            <img 
              src="/lovable-uploads/730698ea-a3a2-4ade-b2a7-2b63eb99bdf2.png" 
              alt="Proposal.fit" 
              className="h-16 sm:h-20"
            />
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            Upload. Analyse. 
            <span className="text-primary"> Respond.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Transform your tender response process with AI-powered document analysis. 
            Upload your tender document and get professional responses in minutes.
          </p>
          
          <div className="space-y-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/new-tender">
                <Upload className="mr-2 h-5 w-5" />
                Upload Tender Document
              </Link>
            </Button>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="lg" onClick={handleDashboardClick}>
                {user ? "View Dashboard" : "Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button variant="ghost" asChild>
                <Link to="/auth">
                  Get Started Free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Features & Process */}
      <div className="flex-1 px-6 lg:px-12 py-12">
        <div className="max-w-xl mx-auto lg:mx-0">
          <h2 className="text-2xl font-semibold mb-6">How it works</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Upload Your Document</h3>
                <p className="text-sm text-muted-foreground">
                  Drag & drop your tender document (PDF, DOCX, XLSX)
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI extracts questions and understands requirements
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Generated Responses</h3>
                <p className="text-sm text-muted-foreground">
                  Receive tailored responses based on your company profile
                </p>
              </div>
            </div>
          </div>
          
          {/* Feature Cards */}
          <div className="grid gap-4 mt-12">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Smart Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Advanced AI parsing of complex tender documents
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Personalised Responses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Responses tailored to your company's profile and experience
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Quality Control</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Review and approve all responses before submission
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};