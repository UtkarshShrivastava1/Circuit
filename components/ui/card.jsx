import * as React from "react"
import { cn } from "@/lib/utils"

// Enhanced Card with better accessibility and styling options
const Card = React.forwardRef(({ 
  className, 
  variant = "default",
  hoverable = false,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
      {
        // Variant styles
        "border-border": variant === "default",
        "border-destructive/50 bg-destructive/5": variant === "destructive",
        "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30": variant === "warning",
        "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30": variant === "success",
        
        // Hover effects
        "hover:shadow-md hover:scale-[1.02] cursor-pointer": hoverable,
      },
      className
    )}
    role={hoverable ? "button" : undefined}
    tabIndex={hoverable ? 0 : undefined}
    {...props}
  />
))
Card.displayName = "Card"

// Enhanced CardHeader with optional actions
const CardHeader = React.forwardRef(({ 
  className,
  children,
  action,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      action && "sm:flex-row sm:items-start sm:justify-between sm:space-y-0",
      className
    )}
    {...props}
  >
    <div className="flex flex-col space-y-1.5">
      {children}
    </div>
    {action && (
      <div className="flex-shrink-0 mt-2 sm:mt-0">
        {action}
      </div>
    )}
  </div>
))
CardHeader.displayName = "CardHeader"

// Enhanced CardTitle with size variants
const CardTitle = React.forwardRef(({ 
  className,
  size = "default",
  as: Component = "h3",
  ...props 
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight",
      {
        "text-lg": size === "sm",
        "text-2xl": size === "default",
        "text-3xl": size === "lg",
      },
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// Enhanced CardDescription with better typography
const CardDescription = React.forwardRef(({ 
  className,
  truncate = false,
  ...props 
}, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground leading-relaxed",
      truncate && "truncate",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// Enhanced CardContent with padding variants
const CardContent = React.forwardRef(({ 
  className,
  noPadding = false,
  ...props 
}, ref) => (
  <div 
    ref={ref} 
    className={cn(
      !noPadding && "p-6 pt-0",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

// Enhanced CardFooter with layout options
const CardFooter = React.forwardRef(({ 
  className,
  justify = "start",
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0 gap-2",
      {
        "justify-start": justify === "start",
        "justify-center": justify === "center",
        "justify-end": justify === "end",
        "justify-between": justify === "between",
      },
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// New: Compact card variant for lists
const CardCompact = React.forwardRef(({ className, ...props }, ref) => (
  <Card
    ref={ref}
    className={cn("p-4", className)}
    {...props}
  />
))
CardCompact.displayName = "CardCompact"

// New: Loading skeleton for cards
const CardSkeleton = ({ className, ...props }) => (
  <Card className={cn("animate-pulse", className)} {...props}>
    <CardHeader>
      <div className="h-6 bg-muted rounded w-3/4 mb-2" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </CardContent>
  </Card>
)
CardSkeleton.displayName = "CardSkeleton"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardCompact,
  CardSkeleton
}