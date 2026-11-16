import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantityStepperProps {
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
  label?: string;
}

export const QuantityStepper = ({ quantity, max, onChange, label = 'Quantity' }: QuantityStepperProps) => {
  const ceiling = Math.min(max, 20);

  return (
    <div className="inline-flex items-center rounded-md border border-input">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-r-none"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      {/* aria-live announces the new value to screen readers after a click. */}
      <span
        className="tabular w-10 text-center text-sm font-medium"
        aria-live="polite"
        aria-label={`${label}: ${quantity}`}
      >
        {quantity}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-l-none"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= ceiling}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
};
