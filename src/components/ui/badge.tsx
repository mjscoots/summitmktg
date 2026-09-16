import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-secondary !text-foreground",
        solid: "border-transparent bg-primary !text-primary-foreground",
        secondary: "border-border/60 bg-secondary !text-secondary-foreground",
        destructive: "border-destructive/45 bg-secondary !text-foreground",
        success: "border-success/45 bg-secondary !text-foreground",
        warning: "border-warning/45 bg-secondary !text-foreground",
        outline: "border-border/70 !text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
