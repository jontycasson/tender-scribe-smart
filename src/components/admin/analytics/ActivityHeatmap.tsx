import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HeatmapData {
  hour: string;
  activity: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
}

export const ActivityHeatmap = ({ data }: ActivityHeatmapProps) => {
  const maxActivity = Math.max(...data.map(d => d.activity));
  
  const getColor = (value: number) => {
    const intensity = value / maxActivity;
    if (intensity > 0.7) return 'hsl(var(--primary))';
    if (intensity > 0.4) return 'hsl(var(--chart-2))';
    return 'hsl(var(--chart-3))';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peak Activity Times</CardTitle>
        <CardDescription>Hourly usage distribution over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="hour" 
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
            <Bar dataKey="activity" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.activity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
