import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  UserBusinessRow,
  UserRegisterBusinessInput,
  UserUpdateBusinessInput,
  BusinessImage,
  ApiError,
} from '@/types';

interface MyBusinessesResult {
  success: boolean;
  error?: string;
  businesses?: Array<Record<string, unknown>>;
}

interface RegisterResult {
  success: boolean;
  error?: string;
  business_id?: string;
  fee_paid?: number;
  new_balance?: number;
}

interface UpgradeResult {
  success: boolean;
  error?: string;
  fee_paid?: number;
  new_balance?: number;
  expires_at?: string;
}

interface MutationResult {
  success: boolean;
  error?: string;
}

interface ImagesResult {
  success: boolean;
  error?: string;
  images?: Array<{ id: string; image_path: string; sort_order: number }>;
}

interface AddImageResult {
  success: boolean;
  error?: string;
  image_id?: string;
}

function mapUserBusiness(row: Record<string, unknown>): UserBusinessRow {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    short_description: row.short_description as string | null,
    category_id: row.category_id as string,
    category_name: row.category_name as string,
    category_slug: row.category_slug as string,
    city: row.city as string | null,
    locality: row.locality as string | null,
    logo_path: row.logo_path as string | null,
    cover_path: row.cover_path as string | null,
    status: row.status as UserBusinessRow['status'],
    is_featured: row.is_featured as boolean,
    subscription_type: row.subscription_type as UserBusinessRow['subscription_type'],
    subscription_expires_at: row.subscription_expires_at as string | null,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    created_at: row.created_at as string,
  };
}

export class UserBusinessService extends BaseService {
  async getMyBusinesses(): Promise<UserBusinessRow[]> {
    const { data, error } = await this.client.rpc('user_get_my_businesses');

    if (error) throw normalizeError(error);

    const result = data as MyBusinessesResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت کسب‌وکارها' } as ApiError;
    }

    return (result.businesses ?? []).map(mapUserBusiness);
  }

  async register(input: UserRegisterBusinessInput): Promise<{ businessId: string; feePaid: number; newBalance: number }> {
    const { data, error } = await this.client.rpc('user_register_business', {
      p_name: input.name,
      p_slug: input.slug,
      p_category_id: input.categoryId,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_city: input.city ?? null,
      p_locality: input.locality ?? null,
      p_address: input.address ?? null,
      p_phone: input.phone ?? null,
      p_website: input.website ?? null,
      p_logo_path: input.logoPath ?? null,
      p_cover_path: input.coverPath ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as RegisterResult;
    if (!result.success || !result.business_id) {
      throw { message: result.error ?? 'خطا در ثبت کسب‌وکار' } as ApiError;
    }

    return {
      businessId: result.business_id,
      feePaid: result.fee_paid ?? 0,
      newBalance: result.new_balance ?? 0,
    };
  }

  async upgradeFeatured(businessId: string): Promise<{ feePaid: number; newBalance: number; expiresAt: string }> {
    const { data, error } = await this.client.rpc('user_upgrade_business_featured', {
      p_business_id: businessId,
    });

    if (error) throw normalizeError(error);

    const result = data as UpgradeResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ارتقای کسب‌وکار' } as ApiError;
    }

    return {
      feePaid: result.fee_paid ?? 0,
      newBalance: result.new_balance ?? 0,
      expiresAt: result.expires_at ?? '',
    };
  }

  async update(businessId: string, input: UserUpdateBusinessInput): Promise<void> {
    const { data, error } = await this.client.rpc('user_update_my_business', {
      p_business_id: businessId,
      p_name: input.name ?? null,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_city: input.city ?? null,
      p_locality: input.locality ?? null,
      p_address: input.address ?? null,
      p_phone: input.phone ?? null,
      p_website: input.website ?? null,
      p_logo_path: input.logoPath ?? null,
      p_cover_path: input.coverPath ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش کسب‌وکار' } as ApiError;
    }
  }

  async listImages(businessId: string): Promise<BusinessImage[]> {
    const { data, error } = await this.client.rpc('user_list_my_business_images', {
      p_business_id: businessId,
    });

    if (error) throw normalizeError(error);

    const result = data as ImagesResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت تصاویر' } as ApiError;
    }

    return (result.images ?? []).map((img) => ({
      id: img.id,
      imagePath: img.image_path,
      sortOrder: img.sort_order,
    }));
  }

  async addImage(businessId: string, imagePath: string): Promise<string> {
    const { data, error } = await this.client.rpc('user_add_my_business_image', {
      p_business_id: businessId,
      p_image_path: imagePath,
    });

    if (error) throw normalizeError(error);

    const result = data as AddImageResult;
    if (!result.success || !result.image_id) {
      throw { message: result.error ?? 'خطا در افزودن تصویر' } as ApiError;
    }

    return result.image_id;
  }

  async deleteImage(imageId: string): Promise<void> {
    const { data, error } = await this.client.rpc('user_delete_my_business_image', {
      p_image_id: imageId,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف تصویر' } as ApiError;
    }
  }
}

export const userBusinessService = new UserBusinessService();
