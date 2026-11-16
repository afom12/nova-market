import { Badge } from '@/components/ui/badge';
import {
  orderStatusLabel,
  orderStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/utils/format';
import type { OrderStatus, PaymentStatus } from '@/types';

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge tone={orderStatusTone[status]}>{orderStatusLabel[status]}</Badge>
);

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus | null | undefined }) => {
  if (!status) return <Badge tone="neutral">No payment record</Badge>;
  return <Badge tone={paymentStatusTone[status]}>{paymentStatusLabel[status]}</Badge>;
};
