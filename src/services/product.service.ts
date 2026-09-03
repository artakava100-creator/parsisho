import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { Product, ProductVariant, ProductMedia, PublicProductInventory, ProductPrice, ApiError } from '@/types';

interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  brand_id: string | null;
  seller_id: string | null;
  producer_id: string | null;
  status: string;
  is_published: boolean;
  is_active: boolean;
  is_new: boolean;
  is_selected: boolean;
  is_economic: boolean;
  is_best_seller: boolean;
  is_popular: boolean;
  is_special_offer: boolean;
  is_discounted: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface VariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  name: string;
  attributes: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface MediaRow {
  id: string;
  product_id: string;
  media_type: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

interface PublicInventoryRow {
  product_id: string;
  stock_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
}

interface PriceRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  price_type: string;
  amount: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDescription: row.short_description,
    description: row.description,
    brandId: row.brand_id,
    sellerId: row.seller_id,
    producerId: row.producer_id,
    status: row.status as Product['status'],
    isPublished: row.is_published,
    isActive: row.is_active,
    isNew: row.is_new,
    isSelected: row.is_selected,
    isEconomic: row.is_economic,
    isBestSeller: row.is_best_seller,
    isPopular: row.is_popular,
    isSpecialOffer: row.is_special_offer,
    isDiscounted: row.is_discounted,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    attributes: row.attributes,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMedia(row: MediaRow): ProductMedia {
  return {
    id: row.id,
    productId: row.product_id,
    mediaType: row.media_type as ProductMedia['mediaType'],
    url: row.url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

function mapPublicInventory(row: PublicInventoryRow): PublicProductInventory {
  return {
    productId: row.product_id,
    stockQuantity: row.stock_quantity,
    availableQuantity: row.available_quantity,
    lowStockThreshold: row.low_stock_threshold,
    allowBackorder: row.allow_backorder,
  };
}

function mapPrice(row: PriceRow): ProductPrice {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    priceType: row.price_type as ProductPrice['priceType'],
    amount: Number(row.amount),
    currency: row.currency,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductService extends BaseService {
  async getProducts(opts?: {
    categoryId?: string;
    limit?: number;
    offset?: number;
    onlyBestSellers?: boolean;
    onlyNew?: boolean;
  }): Promise<Product[]> {
    let query = this.client
      .from('products')
      .select('*')
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (opts?.categoryId) {
      query = query.eq('category_id', opts.categoryId);
    }
    if (opts?.onlyBestSellers) {
      query = query.eq('is_best_seller', true);
    }
    if (opts?.onlyNew) {
      query = query.eq('is_new', true);
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }
    if (opts?.offset) {
      query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw normalizeError(error);
    return (data as ProductRow[]).map(mapProduct);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapProduct(data as ProductRow);
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapProduct(data as ProductRow);
  }

  async getVariants(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await this.client
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw normalizeError(error);
    return (data as VariantRow[]).map(mapVariant);
  }

  async getMedia(productId: string): Promise<ProductMedia[]> {
    const { data, error } = await this.client
      .from('product_media')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (error) throw normalizeError(error);
    return (data as MediaRow[]).map(mapMedia);
  }

  async getInventory(productId: string): Promise<PublicProductInventory | null> {
    const { data, error } = await this.client
      .from('product_inventory_public')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapPublicInventory(data as PublicInventoryRow);
  }

  async getPrices(productId: string): Promise<ProductPrice[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('product_prices')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('price_type', { ascending: true });

    if (error) throw normalizeError(error);
    return (data as PriceRow[]).map(mapPrice);
  }

  async getEffectivePrice(productId: string): Promise<ProductPrice | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('product_prices')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('price_type', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapPrice(data as PriceRow);
  }
}

export const productService = new ProductService();
