import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

interface ProcessingStage {
  id: string;
  label: string;
  description?: string;
}

interface ProcessingProgressProps {
  stages: ProcessingStage[];
  currentStageIndex: number;
  progress: number;
  isComplete?: boolean;
  error?: string;
}

export const ProcessingProgress = ({
  stages,
  currentStageIndex,
  progress,
  isComplete = false,
  error
}: ProcessingProgressProps) => {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{isComplete ? "Complete" : error ? "Failed" : stages[currentStageIndex]?.label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress 
          value={progress} 
          className="h-2"
        />
      </div>

      {/* Stage List */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isActive = index === currentStageIndex && !isComplete && !error;
          const isCompleted = index < currentStageIndex || isComplete;
          const isFailed = error && index === currentStageIndex;

          return (
            <div
              key={stage.id}
              className={`flex items-start space-x-3 transition-all duration-300 ${
                isActive || isCompleted ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isFailed ? (
                  <Circle className="h-5 w-5 text-destructive" />
                ) : isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isFailed ? "text-destructive" : 
                  isCompleted ? "text-green-700 dark:text-green-400" :
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {stage.label}
                </p>
                {stage.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stage.description}
                  </p>
                )}
                {isFailed && error && (
                  <p className="text-xs text-destructive mt-1">
                    {error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Stage Description */}
      {!isComplete && !error && stages[currentStageIndex]?.description && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {stages[currentStageIndex].description}
          </p>
        </div>
      )}
    </div>
  );
};