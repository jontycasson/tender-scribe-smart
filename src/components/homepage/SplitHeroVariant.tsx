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
          <div className="max-w-2xl">
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Win More Tenders — 
              <span className="text-primary block">10x Faster</span>
              with AI
            </h1>
            
            <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
              Proposal.fit uses AI to turn complex tenders into complete, accurate responses in minutes — not days.
              From document analysis to answer drafting, it does the heavy lifting for you.
            </p>
            
            {/* Speed Highlight */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-2xl font-bold text-primary">⚡ 10x Faster Tender Responses</div>
                  <div className="text-sm text-muted-foreground">Accurate, AI-generated answers — in minutes.</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button asChild size="lg">
                <Link to="/try">
                  Try Proposal.fit Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">⏱️ Hours Saved Per Response</div>
                <div className="text-sm text-muted-foreground">AI handles the hard work so you don't have to</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">🧠 95% Drafting Accuracy</div>
                <div className="text-sm text-muted-foreground">Tailored answers, aligned with your policies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">🏗️ Built for Tender Teams</div>
                <div className="text-sm text-muted-foreground">Used by bid and commercial teams</div>
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

      {/* How It Works Section */}
      <div className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Upload & Analyse</h3>
              <p className="text-muted-foreground">
                Upload any tender document (PDF, Word, Excel). We scan and extract all questions automatically.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Auto-Draft Answers</h3>
              <p className="text-muted-foreground">
                Answers are generated using your company profile, past responses, and best-practice AI models.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Edit, Approve & Export</h3>
              <p className="text-muted-foreground">
                Review and edit drafts in-app, then export your completed response in your preferred format.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Built for Collaboration</h3>
              <p className="text-muted-foreground">
                Assign questions to team members, track progress, and collaborate securely in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Why Teams Choose Proposal.fit
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="text-3xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold mb-3">Save Days of Work</h3>
              <p className="text-muted-foreground">
                Reduce manual copy/paste and formatting from hours to minutes.
              </p>
            </div>
            
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-3">Smarter Every Time</h3>
              <p className="text-muted-foreground">
                Built-in memory learns your preferred answers, tone, and exclusions.
              </p>
            </div>
            
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-3">Secure & Compliant</h3>
              <p className="text-muted-foreground">
                Powered by OpenAI, Google Document AI (EU deployment), and SOC2-compliant Supabase.
              </p>
            </div>
            
            <div className="text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="text-3xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold mb-3">No Setup Required</h3>
              <p className="text-muted-foreground">
                Works out-of-the-box. Upload your first tender and go.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Start winning tenders faster — today.
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            No credit card required. EU-based document processing.
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-4">
            <Link to="/auth">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
};