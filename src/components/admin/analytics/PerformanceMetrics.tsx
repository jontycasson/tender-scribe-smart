import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface PerformanceMetricsProps {
  metrics: {
    avgResponseTime: number;
    errorRate: number;
    successRate: number;
    activeRequests: number;
  };
}

export const PerformanceMetrics = ({ metrics }: PerformanceMetricsProps) => {
  const performanceData: Metric[] = [
    {
      label: "Avg Response Time",
      value: `${metrics.avgResponseTime}ms`,
      change: "-12% from last week",
      trend: 'down',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Error Rate",
      value: `${metrics.errorRate}%`,
      change: metrics.errorRate < 1 ? "Excellent" : "Needs attention",
      trend: metrics.errorRate < 1 ? 'down' : 'up',
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      label: "Success Rate",
      value: `${metrics.successRate}%`,
      change: "+2% from last week",
      trend: 'up',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Active Requests",
      value: metrics.activeRequests.toString(),
      change: "Currently processing",
      trend: 'neutral',
      icon: <Activity className="h-4 w-4" />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>System health and response times</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {performanceData.map((metric, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 rounded-lg border border-border p-4"
            >
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                {metric.icon}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className={`text-xs ${
                  metric.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                  metric.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                }`}>
                  {metric.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
