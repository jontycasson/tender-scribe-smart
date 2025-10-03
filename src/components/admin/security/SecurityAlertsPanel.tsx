import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, Database, Lock, Key } from "lucide-react";

export const SecurityAlertsPanel = () => {
  const securityChecks = [
    {
      name: "Row Level Security (RLS)",
      status: "active",
      description: "All tables protected with RLS policies",
      icon: Database,
      color: "green",
    },
    {
      name: "Admin Role Management",
      status: "active",
      description: "Secure role-based access control",
      icon: Shield,
      color: "green",
    },
    {
      name: "JWT Validation",
      status: "active",
      description: "Token-based authentication enabled",
      icon: Key,
      color: "green",
    },
    {
      name: "Password Policies",
      status: "warning",
      description: "Consider enabling leaked password protection",
      icon: Lock,
      color: "yellow",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-500';
      case 'yellow': return 'text-yellow-500';
      case 'red': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
        <CardDescription>
          Current security configuration and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {securityChecks.map((check, index) => {
            const Icon = check.icon;
            return (
              <div
                key={index}
                className="flex items-start justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${getIconColor(check.color)}`} />
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-sm text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
