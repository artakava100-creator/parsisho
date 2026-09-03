import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type {
  CreateOrderInput,
  CreateOrderResult,
  StoreOrder,
  StoreOrderItem,
} from '@/types';

function generateOrderNumber(): string {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PS-${ts}${rand}`;
}

function mapOrderRow(row: Record<string, unknown>): StoreOrder {
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    status: row.status as StoreOrder['status'],
    subtotal: row.subtotal as number,
    discount: (row.discount as number) ?? 0,
    shippingCost: row.shipping_cost as number,
    paymentFee: (row.payment_fee as number) ?? 0,
    total: row.total as number,
    customerName: row.customer_name as string,
    mobileNumber: row.mobile_number as string,
    province: row.province as string,
    city: row.city as string,
    address: row.address as string,
    postalCode: row.postal_code as string,
    deliveryNote: (row.delivery_note as string) ?? null,
    paymentStatus: row.payment_status as StoreOrder['paymentStatus'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapItemRow(row: Record<string, unknown>): StoreOrderItem {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    productImage: (row.product_image as string) ?? null,
    unitPrice: row.unit_price as number,
    quantity: row.quantity as number,
    subtotal: row.subtotal as number,
  };
}

export const orderService = {
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    try {
      const orderNumber = generateOrderNumber();

      const { data: orderRow, error: orderError } = await supabase
        .from('store_orders')
        .insert({
          order_number: orderNumber,
          status: 'pending',
          subtotal: input.subtotal,
          discount: input.discount,
          shipping_cost: input.shippingCost,
          payment_fee: input.paymentFee,
          total: input.total,
          customer_name: input.customerName,
          mobile_number: input.mobileNumber,
          province: input.province,
          city: input.city,
          address: input.address,
          postal_code: input.postalCode,
          delivery_note: input.deliveryNote ?? null,
          payment_status: 'unpaid',
        })
        .select()
        .single();

      if (orderError || !orderRow) {
        logger.error('[orderService.createOrder] insert failed', orderError);
        return { success: false, error: 'ثبت سفارش ناموفق بود' };
      }

      const order = mapOrderRow(orderRow as Record<string, unknown>);

      const itemRows = input.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('store_order_items')
        .insert(itemRows);

      if (itemsError) {
        logger.error('[orderService.createOrder] items insert failed', itemsError);
        await supabase.from('store_orders').delete().eq('id', order.id);
        return { success: false, error: 'ثبت اقلام سفارش ناموفق بود' };
      }

      return { success: true, order };
    } catch (err) {
      logger.error('[orderService.createOrder] exception', err);
      return { success: false, error: 'خطای غیرمنتظره در ثبت سفارش' };
    }
  },

  async getOrders(): Promise<{ data: StoreOrder[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[orderService.getOrders]', error);
        return { data: [], error: 'بارگذاری سفارش‌ها ناموفق بود' };
      }

      return { data: (data as Record<string, unknown>[]).map(mapOrderRow), error: null };
    } catch {
      return { data: [], error: 'خطای غیرمنتظره' };
    }
  },

  async getOrderById(id: string): Promise<{ data: (StoreOrder & { items: StoreOrderItem[] }) | null; error: string | null }> {
    try {
      const { data: orderRow, error: orderError } = await supabase
        .from('store_orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (orderError) {
        logger.error('[orderService.getOrderById]', orderError);
        return { data: null, error: 'بارگذاری سفارش ناموفق بود' };
      }

      if (!orderRow) return { data: null, error: null };

      const { data: itemRows, error: itemsError } = await supabase
        .from('store_order_items')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true });

      if (itemsError) {
        logger.error('[orderService.getOrderById] items', itemsError);
        return { data: null, error: 'بارگذاری اقلام سفارش ناموفق بود' };
      }

      const order = mapOrderRow(orderRow as Record<string, unknown>);
      const items = (itemRows as Record<string, unknown>[]).map(mapItemRow);
      return { data: { ...order, items }, error: null };
    } catch {
      return { data: null, error: 'خطای غیرمنتظره' };
    }
  },
};
