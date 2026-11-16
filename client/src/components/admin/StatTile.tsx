import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  emphasis?: boolean;
}

/**
 * A single number with its label — the right form when there is no shape to
 * show. The figure wears an ink token, not a series colour.
 */
export const StatTile = ({ label, value, hint, icon: Icon, emphasis = false }: StatTileProps) => (
  <Card className={cn(emphasis && 'border-primary/25 bg-primary/[0.03]')}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-eyebrow">{label}</p>
        <Icon
          className={cn('h-4 w-4 shrink-0', emphasis ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tightest">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  </Card>
);
