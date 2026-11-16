export type Role = 'CUSTOMER' | 'ADMIN';

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Integer minor units (cents). Never a float. */
  priceCents: number;
  currency: string;
  imageUrl: string;
  category: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  productImage: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalCents: number;
  totalAmountCents: number;
  currency: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment: Payment | null;
}

export interface AdminOrder extends Order {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RevenuePoint {
  date: string;
  revenueCents: number;
  orders: number;
}

export interface AdminStats {
  totalOrders: number;
  paidOrders: number;
  successfulRevenueCents: number;
  averageOrderValueCents: number;
  totalCustomers: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  payments: {
    pending: number;
    processing: number;
    successful: number;
    failed: number;
    cancelled: number;
    expired: number;
    refunded: number;
  };
  recentPurchases: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmountCents: number;
    currency: string;
    createdAt: string;
    customer: Pick<User, 'id' | 'name' | 'email'>;
    itemCount: number;
  }>;
  revenueOverview: RevenuePoint[];
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
  orderId: string;
  orderNumber: string;
  totalAmountCents: number;
  currency: string;
}

/** Normalised error shape produced by the API client. */
export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Array<{ field?: string; message?: string; productId?: string; reason?: string }>;
  status: number;
}
