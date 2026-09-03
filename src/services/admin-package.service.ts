import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { ParsiPackage, ApiError } from '@/types';

interface PackageRow {
  id: string;
  parsi_amount: number;
  price: number;
  bonus_amount: number;
  is_active: boolean;
  sort_order: number;
  label: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminListResult {
  success: boolean;
  error?: string;
  packages?: PackageRow[];
}

interface AdminMutationResult {
  success: boolean;
  error?: string;
  package_id?: string;
}

function mapPackage(row: PackageRow): ParsiPackage {
  return {
    id: row.id,
    parsiAmount: row.parsi_amount,
    price: row.price,
    bonusAmount: row.bonus_amount,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreatePackageInput {
  parsiAmount: number;
  price: number;
  bonusAmount?: number;
  label?: string | null;
  sortOrder?: number;
}

export interface UpdatePackageInput {
  parsiAmount?: number;
  price?: number;
  bonusAmount?: number;
  label?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export class AdminPackageService extends BaseService {
  async getAll(): Promise<ParsiPackage[]> {
    const { data, error } = await this.client.rpc('admin_list_parsi_packages');

    if (error) throw normalizeError(error);

    const result = data as AdminListResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت پکیج‌ها' } as ApiError;
    }

    return (result.packages ?? []).map(mapPackage);
  }

  async create(input: CreatePackageInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_parsi_package', {
      p_parsi_amount: input.parsiAmount,
      p_price: input.price,
      p_bonus_amount: input.bonusAmount ?? 0,
      p_label: input.label ?? null,
      p_sort_order: input.sortOrder ?? 0,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminMutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد پکیج' } as ApiError;
    }

    return result.package_id!;
  }

  async update(packageId: string, input: UpdatePackageInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_parsi_package', {
      p_package_id: packageId,
      p_parsi_amount: input.parsiAmount ?? null,
      p_price: input.price ?? null,
      p_bonus_amount: input.bonusAmount ?? null,
      p_label: input.label ?? null,
      p_sort_order: input.sortOrder ?? null,
      p_is_active: input.isActive ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminMutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش پکیج' } as ApiError;
    }
  }
}

export const adminPackageService = new AdminPackageService();
