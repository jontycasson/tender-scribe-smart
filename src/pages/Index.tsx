import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, FileText, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="h-12 w-12 text-primary mr-4" />
            <h1 className="text-5xl font-bold">TenderFlow</h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your tender response process with AI-powered document analysis, 
            automated drafting, and intelligent company profile matching.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg">
              <Link to="/onboarding">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/dashboard">
                View Dashboard
              </Link>
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
              <h3 className="text-lg font-semibold mb-2">Personalized Responses</h3>
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
    </div>
  );
};

export default Index;
