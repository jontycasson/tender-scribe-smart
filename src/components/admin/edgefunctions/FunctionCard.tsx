import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code, ExternalLink, Activity, Clock, CheckCircle, XCircle } from "lucide-react";

interface FunctionCardProps {
  name: string;
  invocations24h: number;
  avgExecutionTime: number;
  successRate: number;
  errorCount: number;
  onViewLogs: () => void;
  onViewCode: () => void;
}

export const FunctionCard = ({
  name,
  invocations24h,
  avgExecutionTime,
  successRate,
  errorCount,
  onViewLogs,
  onViewCode,
}: FunctionCardProps) => {
  const getStatusColor = () => {
    if (successRate >= 99) return "text-green-600 dark:text-green-400";
    if (successRate >= 95) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-mono">{name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={successRate >= 99 ? "default" : "destructive"} className="text-xs">
                {successRate.toFixed(1)}% Success
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {errorCount} errors
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onViewLogs}>
              <Activity className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onViewCode}>
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              Invocations (24h)
            </div>
            <p className="text-2xl font-bold">{invocations24h.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Avg Time
            </div>
            <p className="text-2xl font-bold">{avgExecutionTime}ms</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className={getStatusColor()}>{successRate.toFixed(1)}%</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span>{errorCount} failures</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
