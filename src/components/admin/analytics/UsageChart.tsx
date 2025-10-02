import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UsageChartProps {
  data: Array<{
    date: string;
    tenders: number;
    responses: number;
    users: number;
  }>;
}

export const UsageChart = ({ data }: UsageChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Usage Trends</CardTitle>
        <CardDescription>Activity over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
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
            <Legend />
            <Line 
              type="monotone" 
              dataKey="tenders" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Tenders"
            />
            <Line 
              type="monotone" 
              dataKey="responses" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Responses"
            />
            <Line 
              type="monotone" 
              dataKey="users" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              name="Active Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
