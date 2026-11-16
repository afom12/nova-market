import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-card text-muted-foreground',
        success: 'border-success/25 bg-success/[0.07] text-success',
        warning: 'border-warning/25 bg-warning/[0.07] text-warning',
        danger: 'border-destructive/25 bg-destructive/[0.07] text-destructive',
        info: 'border-foreground/15 bg-card text-foreground',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Status is always carried by the text as well as the colour, so the
 * information survives for colour-blind users and in grayscale print.
 */
const Badge = ({ className, tone, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props} />
);

export { Badge, badgeVariants };
