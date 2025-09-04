import * as React from "react";
import { cn } from "@/lib/utils";

// Typescript: you can add prop types if desired
const Input = React.forwardRef(
  (
    {
      className,
      type = "text",
      leftIcon,
      rightIcon,
      error,
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xl pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition",
            leftIcon ? "pl-10" : "",
            rightIcon ? "pr-10" : "",
            error ? "border-red-500 focus-visible:ring-red-500" : "",
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xl cursor-pointer">
            {rightIcon}
          </span>
        )}
        {error && (
          <div className="mt-1 text-xs text-red-500">{error}</div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
