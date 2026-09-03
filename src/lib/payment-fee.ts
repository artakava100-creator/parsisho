import type { PaymentFeeType, StoreSettings } from '@/types';

export interface PaymentFeeCalculation {
  fee: number;
  type: PaymentFeeType;
  percentage: number;
  fixedAmount: number;
}

export function calculatePaymentFee(
  settings: StoreSettings,
  subtotal: number,
  discount: number = 0,
): PaymentFeeCalculation {
  const taxableBase = Math.max(0, subtotal - discount);

  switch (settings.paymentFeeType) {
    case 'none':
      return { fee: 0, type: 'none', percentage: 0, fixedAmount: 0 };

    case 'percentage':
      return {
        fee: Math.round((taxableBase * settings.paymentFeePercentage) / 100),
        type: 'percentage',
        percentage: settings.paymentFeePercentage,
        fixedAmount: 0,
      };

    case 'fixed':
      return {
        fee: settings.paymentFeeFixedAmount,
        type: 'fixed',
        percentage: 0,
        fixedAmount: settings.paymentFeeFixedAmount,
      };

    case 'combined':
      return {
        fee: Math.round((taxableBase * settings.paymentFeePercentage) / 100) + settings.paymentFeeFixedAmount,
        type: 'combined',
        percentage: settings.paymentFeePercentage,
        fixedAmount: settings.paymentFeeFixedAmount,
      };

    default:
      return { fee: 0, type: 'none', percentage: 0, fixedAmount: 0 };
  }
}

export interface OrderPriceCalculation {
  subtotal: number;
  discount: number;
  shippingCost: number;
  paymentFee: number;
  total: number;
}

export function calculateOrderPrice(params: {
  subtotal: number;
  discount?: number;
  shippingCost: number;
  paymentFee: number;
}): OrderPriceCalculation {
  const { subtotal, discount = 0, shippingCost, paymentFee } = params;
  const total = Math.max(0, subtotal - discount + shippingCost + paymentFee);
  return { subtotal, discount, shippingCost, paymentFee, total };
}
