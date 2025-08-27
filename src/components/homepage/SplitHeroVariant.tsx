import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Users, Shield, Zap, Clock, Target } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const SplitHeroVariant = () => {
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
    <>
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 py-12">
          <div className="max-w-xl">
            <div className="flex items-center mb-6">
              <img 
                src="/lovable-uploads/730698ea-a3a2-4ade-b2a7-2b63eb99bdf2.png" 
                alt="Proposal.fit" 
                className="h-20 sm:h-24"
              />
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Win More 
              <span className="text-primary block">Tenders</span>
              with AI
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Streamline your tender response process with intelligent document analysis, 
              automated drafting, and personalised company profile matching.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button asChild size="lg">
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" onClick={handleDashboardClick}>
                {user ? "View Dashboard" : "Sign In"}
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10x</div>
                <div className="text-sm text-muted-foreground">Faster responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">95%</div>
                <div className="text-sm text-muted-foreground">Accuracy rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Tenders processed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Visual/Demo */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12 bg-gradient-to-br from-primary/10 to-accent/20">
          <div className="w-full max-w-md">
            {/* Mock Dashboard Preview */}
            <div className="bg-background rounded-xl shadow-2xl border overflow-hidden">
              <div className="bg-primary text-primary-foreground px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary-foreground/20 rounded-full"></div>
                  <div className="w-3 h-3 bg-primary-foreground/20 rounded-full"></div>
                  <div className="w-3 h-3 bg-primary-foreground/20 rounded-full"></div>
                  <div className="ml-4 text-sm font-medium">proposal.fit</div>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Government Infrastructure Project</div>
                  <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Completed</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">City Council Office Renovation</div>
                  <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Processing</div>
                </div>
                
                <div className="bg-muted rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Analysis Complete</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    25 questions identified • Responses generated in 3.2 minutes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything you need to win tenders
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered platform handles the heavy lifting, so you can focus on what matters most
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Document Analysis</h3>
              <p className="text-muted-foreground">
                Advanced AI parsing extracts key requirements and questions from complex tender documents
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Personalised Responses</h3>
              <p className="text-muted-foreground">
                Tailored responses based on your company profile, experience, and past successes
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quality Assurance</h3>
              <p className="text-muted-foreground">
                Review, edit, and approve all responses before submission with built-in quality checks
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Save Time</h3>
              <p className="text-muted-foreground">
                Reduce tender response time from weeks to hours with automated document processing
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Insights</h3>
              <p className="text-muted-foreground">
                Get immediate analysis of tender requirements and compliance scoring
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Higher Success Rate</h3>
              <p className="text-muted-foreground">
                Improve your tender win rate with professional, consistent, and compelling responses
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};