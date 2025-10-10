import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Loader2 } from "lucide-react";

interface AIGenerateButtonProps {
  fieldName: string;
  onGenerate: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function AIGenerateButton({
  fieldName,
  onGenerate,
  isLoading,
  disabled = false
}: AIGenerateButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onGenerate}
            disabled={disabled || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI will generate {fieldName} based on your company information</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
