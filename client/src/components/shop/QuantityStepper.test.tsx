import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('reports the next value when incrementing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<QuantityStepper quantity={2} max={10} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /increase/i }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('reports the previous value when decrementing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<QuantityStepper quantity={2} max={10} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /decrease/i }));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('cannot go below one', () => {
    render(<QuantityStepper quantity={1} max={10} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('cannot exceed available stock', () => {
    render(<QuantityStepper quantity={4} max={4} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  it('exposes the current quantity to assistive technology', () => {
    render(<QuantityStepper quantity={7} max={10} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Quantity: 7')).toBeInTheDocument();
  });
});
