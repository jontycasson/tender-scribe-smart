import * as React from "react"
import { cn } from "@/lib/utils"

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    React.useImperativeHandle(ref, () => textareaRef.current!)

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`
      }
    }, [])

    React.useEffect(() => {
      adjustHeight()
    }, [adjustHeight, props.value])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight()
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden transition-all duration-200",
          className
        )}
        ref={textareaRef}
        onChange={handleChange}
        style={{ minHeight: '40px' }}
        {...props}
      />
    )
  }
)
AutoTextarea.displayName = "AutoTextarea"

export { AutoTextarea }