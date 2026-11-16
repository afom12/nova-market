import { cn } from '@/utils/cn';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('shimmer rounded-md bg-muted', className)}
    aria-hidden="true"
    {...props}
  />
);

export { Skeleton };
