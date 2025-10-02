import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Progress } from "@/components/ui/progress";

interface JourneyMetric {
  metric: string;
  value: number;
  total: number;
  percentage: number;
}

interface UserJourneyMetricsProps {
  metrics: JourneyMetric[];
}

export const UserJourneyMetrics = ({ metrics }: UserJourneyMetricsProps) => {
  const chartData = metrics.map(m => ({
    name: m.metric,
    percentage: m.percentage,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Journey Analytics</CardTitle>
        <CardDescription>Conversion funnel and feature adoption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="percentage" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{metric.metric}</span>
                <span className="text-muted-foreground">
                  {metric.value}/{metric.total} ({metric.percentage}%)
                </span>
              </div>
              <Progress value={metric.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
