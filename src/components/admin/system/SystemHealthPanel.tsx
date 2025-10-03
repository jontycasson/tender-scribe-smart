import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Activity, Database, Zap, HardDrive } from "lucide-react";

export const SystemHealthPanel = () => {
  const healthChecks = [
    {
      name: "Database",
      status: "healthy",
      description: "All database connections active",
      icon: Database,
      color: "green",
    },
    {
      name: "Edge Functions",
      status: "healthy",
      description: "All functions responding normally",
      icon: Zap,
      color: "green",
    },
    {
      name: "Storage",
      status: "healthy",
      description: "File storage operational",
      icon: HardDrive,
      color: "green",
    },
    {
      name: "API Rate Limits",
      status: "warning",
      description: "Approaching daily quota (78% used)",
      icon: Activity,
      color: "yellow",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Healthy
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
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>
          Real-time status of all system components
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {healthChecks.map((check, index) => {
            const Icon = check.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-5 w-5 ${getIconColor(check.color)}`} />
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
