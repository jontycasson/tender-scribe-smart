import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Upload, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  showNewTenderButton?: boolean;
}

export const Navigation = ({ showNewTenderButton = false }: NavigationProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  const navigationLinks = [
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Benefits", href: "/#benefits" },
    { name: "Testimonials", href: "/#testimonials" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQ", href: "/#faq" }
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="/lovable-uploads/730698ea-a3a2-4ade-b2a7-2b63eb99bdf2.png" 
                alt="Proposal.fit" 
                className="h-12"
              />
            </Link>
          </div>

          {/* Navigation Links - Hidden on mobile, shown on desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationLinks.map((link) => (
              link.href.startsWith('#') ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {user && showNewTenderButton && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/new-tender">
                  <Upload className="h-4 w-4 mr-2" />
                  New Tender
                </Link>
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      Tender Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/onboarding" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" asChild>
                  <Link to="/auth">Log In</Link>
                </Button>
                <Button asChild>
                  <Link to="/try">Try Now</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};