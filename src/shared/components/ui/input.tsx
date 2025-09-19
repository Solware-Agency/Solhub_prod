import * as React from "react"

import { cn } from "@shared/lib/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, iconLeft, iconRight, ...props }, ref) => {
    return (
      <div className="relative">
        {iconLeft && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {iconLeft}
          </div>
        )}
        <input
          type={type}
          autoComplete="new-password"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-transform duration-200 hover:border-primary/50 hover:shadow-sm",
            iconLeft ? "pl-10" : "px-3",
            iconRight ? "pr-10" : "px-3",
            className
          )}
          ref={ref}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {iconRight}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }