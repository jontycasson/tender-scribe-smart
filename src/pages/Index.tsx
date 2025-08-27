import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePreview } from "@/hooks/usePreview";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DocumentFirstVariant } from "@/components/homepage/DocumentFirstVariant";
import { SplitHeroVariant } from "@/components/homepage/SplitHeroVariant";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Users, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const ClassicVariant = () => {
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
      <div className="text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/lovable-uploads/730698ea-a3a2-4ade-b2a7-2b63eb99bdf2.png" 
            alt="Proposal.fit" 
            className="h-32 sm:h-40 md:h-48 lg:h-56"
          />
        </div>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Streamline your tender response process with AI-powered document analysis, 
          automated drafting, and intelligent company profile matching.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button asChild size="lg">
            <Link to="/auth">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={handleDashboardClick}>
            {user ? "View Dashboard" : "View Dashboard (Sign In Required)"}
          </Button>
        </div>
        
        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="text-center p-6 rounded-lg border bg-card">
            <FileText className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Document Analysis</h3>
            <p className="text-muted-foreground">
              AI-powered parsing of tender documents to extract key requirements and questions.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg border bg-card">
            <Users className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Personalised Responses</h3>
            <p className="text-muted-foreground">
              Generate tailored responses based on your company profile and past successes.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg border bg-card">
            <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Quality Assurance</h3>
            <p className="text-muted-foreground">
              Review, edit, and approve all responses before submission with built-in quality checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const { homepageVariant } = usePreview();

  const renderVariant = () => {
    switch (homepageVariant) {
      case 'document-first':
        return <DocumentFirstVariant />;
      case 'split-hero':
        return <SplitHeroVariant />;
      case 'classic':
      default:
        return <ClassicVariant />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {renderVariant()}
      <PreviewPanel currentPage="homepage" />
    </div>
  );
};

export default Index;
