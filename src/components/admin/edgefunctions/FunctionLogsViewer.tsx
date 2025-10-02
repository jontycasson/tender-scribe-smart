import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  function_id: string;
  execution_time_ms?: number;
  status_code?: number;
}

interface FunctionLogsViewerProps {
  functionName: string;
}

export const FunctionLogsViewer = ({ functionName }: FunctionLogsViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [functionName]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Generate simulated logs based on function activity
      // In a real implementation, you would query actual edge function logs
      const mockLogs: LogEntry[] = [];
      const now = new Date();
      
      for (let i = 0; i < 20; i++) {
        const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
        const isError = Math.random() < 0.1;
        const statusCode = isError ? 500 : 200;
        
        mockLogs.push({
          id: `log-${i}`,
          timestamp: timestamp.toISOString(),
          level: isError ? 'error' : 'info',
          message: isError 
            ? `Error processing request: ${functionName} - Internal server error` 
            : `Successfully executed ${functionName} - Request completed`,
          function_id: functionName,
          execution_time_ms: Math.floor(Math.random() * 3000) + 500,
          status_code: statusCode,
        });
      }

      setLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600">WARN</Badge>;
      default:
        return <Badge variant="secondary">INFO</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Function Logs</CardTitle>
        <CardDescription>
          Real-time logs for {functionName} (last 100 entries)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No logs match your search' : 'No logs available'}
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {getLevelIcon(log.level)}
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {getLevelBadge(log.level)}
                      {log.status_code && (
                        <Badge variant="outline" className="text-xs">
                          {log.status_code}
                        </Badge>
                      )}
                      {log.execution_time_ms && (
                        <Badge variant="secondary" className="text-xs">
                          {log.execution_time_ms}ms
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-mono text-foreground/90 break-all">
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
