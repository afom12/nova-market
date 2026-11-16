import * as ToastPrimitive from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast, type ToastTone } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const toneStyles: Record<ToastTone, string> = {
  default: 'border-border',
  success: 'border-success/30',
  error: 'border-destructive/30',
  warning: 'border-warning/30',
};

const ToneIcon = ({ tone }: { tone: ToastTone }) => {
  const className = 'h-5 w-5 shrink-0';
  switch (tone) {
    case 'success':
      return <CheckCircle2 className={cn(className, 'text-success')} aria-hidden="true" />;
    case 'error':
      return <XCircle className={cn(className, 'text-destructive')} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle className={cn(className, 'text-warning')} aria-hidden="true" />;
    default:
      return <Info className={cn(className, 'text-primary')} aria-hidden="true" />;
  }
};

export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((item) => (
        <ToastPrimitive.Root
          key={item.id}
          duration={item.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(item.id);
          }}
          className={cn(
            'pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-card p-4 shadow-lift',
            'data-[state=open]:animate-fade-in',
            toneStyles[item.tone],
          )}
        >
          <ToneIcon tone={item.tone} />
          <div className="flex-1 space-y-1">
            <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
              {item.title}
            </ToastPrimitive.Title>
            {item.description ? (
              <ToastPrimitive.Description className="text-sm text-muted-foreground">
                {item.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close
            aria-label="Dismiss notification"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}

      <ToastPrimitive.Viewport className="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:bottom-4 sm:right-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  );
};
