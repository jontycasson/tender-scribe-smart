import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';

const Try = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    question: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const { toast } = useToast();

  // Set page metadata
  useEffect(() => {
    document.title = 'Try Proposal.fit — AI Tender Response Generator';
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Test Proposal.fit before you subscribe. Get a sample AI-generated tender response by pasting a question — no sign-up required.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Test Proposal.fit before you subscribe. Get a sample AI-generated tender response by pasting a question — no sign-up required.';
      document.head.appendChild(meta);
    }

    // Cleanup function to restore original title
    return () => {
      document.title = 'Proposal.fit';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.email || !formData.question) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setIsLimitReached(false);

    try {
      const { data, error } = await supabase.functions.invoke('demo-response', {
        body: {
          email: formData.email,
          companyName: formData.companyName,
          question: formData.question
        }
      });

      if (error) {
        console.error('Function error:', error);
        if (error.message?.includes('LIMIT_REACHED') || data?.error === 'LIMIT_REACHED') {
          setIsLimitReached(true);
        } else {
          toast({
            title: "Error",
            description: "Failed to generate response. Please try again.",
            variant: "destructive"
          });
        }
        return;
      }

      if (data?.error === 'LIMIT_REACHED') {
        setIsLimitReached(true);
      } else if (data?.response) {
        setResponse(data.response);
        setRemainingUses(data.remainingUses);
      } else {
        toast({
          title: "Error",
          description: "Failed to generate response. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Try Proposal.fit
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience our AI-powered tender response generator. Get a sample response 
            to see how Proposal.fit can help your business win more contracts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Form Section */}
          <div>
            <Card className="p-8">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-2">
                      Company Name *
                    </label>
                    <Input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your company name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Work Email Address *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="question" className="block text-sm font-medium text-foreground mb-2">
                      Paste one tender-style question *
                    </label>
                    <Textarea
                      id="question"
                      value={formData.question}
                      onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="e.g., Describe your company's approach to project management and quality assurance..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full text-lg py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Response...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Demo Response
                      </>
                    )}
                  </Button>
                </form>

                {/* Legal/Consent Copy */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Your input is processed temporarily and not stored. No documents are uploaded. 
                    By submitting, you agree to receive occasional emails from Proposal.fit. 
                    You can unsubscribe anytime.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Section */}
          <div>
            {response && (
              <Card className="p-8">
                <CardContent className="p-0">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">AI-Generated Response</h3>
                    </div>
                    
                    {/* Demo Watermark */}
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                      <p className="text-sm text-primary font-medium text-center">
                        Generated in demo mode by Proposal.fit
                      </p>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {response}
                      </p>
                    </div>
                  </div>

                  {/* CTA Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold mb-2">Ready to unlock full access?</h4>
                      <p className="text-muted-foreground mb-4">
                        Process complete tender documents, manage unlimited questions, 
                        and export professional responses.
                      </p>
                      {remainingUses !== null && remainingUses > 0 && (
                        <p className="text-sm text-muted-foreground mb-4">
                          You have {remainingUses} demo {remainingUses === 1 ? 'use' : 'uses'} remaining.
                        </p>
                      )}
                      <Button asChild size="lg" className="text-lg px-8">
                        <Link to="/auth">
                          Subscribe to unlock full access to Proposal.fit
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLimitReached && (
              <Card className="p-8">
                <CardContent className="p-0 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Demo Limit Reached</h3>
                    <p className="text-muted-foreground mb-6">
                      You've reached your free demo limit. Subscribe to continue using Proposal.fit.
                    </p>
                    <Button asChild size="lg" className="text-lg px-8">
                      <Link to="/auth">
                        Subscribe Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!response && !isLimitReached && !isLoading && (
              <Card className="p-8">
                <CardContent className="p-0 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Ready to see Proposal.fit in action?</h3>
                  <p className="text-muted-foreground">
                    Fill in the form and submit your question to see a sample AI-generated response.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Try;