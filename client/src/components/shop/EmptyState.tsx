import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-card">
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
    </div>
    <h2 className="mt-5 text-2xl">{title}</h2>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);
