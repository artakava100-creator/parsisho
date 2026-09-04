import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  ProductAttributeDefinition,
  AttributeType,
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
  RpcResult,
  RpcIdResult,
  ApiError,
  AttributeValueItem,
} from '@/types';

interface DefinitionRow {
  id: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  slug: string;
  attribute_type: string;
  options: Record<string, unknown> | null;
  is_filterable: boolean;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapDefinition(row: DefinitionRow): ProductAttributeDefinition {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    slug: row.slug,
    attributeType: row.attribute_type as AttributeType,
    options: row.options,
    isFilterable: row.is_filterable,
    isRequired: row.is_required,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface AttributeValueRow {
  id: string;
  product_id: string;
  product_name: string;
  attribute_definition_id: string;
  definition_name: string;
  definition_slug: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapAttributeValue(row: AttributeValueRow): AttributeValueItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    attributeDefinitionId: row.attribute_definition_id,
    definitionName: row.definition_name,
    definitionSlug: row.definition_slug,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminAttributeService extends BaseService {
  async listDefinitions(): Promise<ProductAttributeDefinition[]> {
    const { data, error } = await this.client.rpc('admin_list_attribute_definitions');
    if (error) throw normalizeError(error);
    return ((data as DefinitionRow[]) ?? []).map(mapDefinition);
  }

  async createDefinition(input: CreateAttributeDefinitionInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_attribute_definition', {
      p_name: input.name,
      p_slug: input.slug,
      p_attribute_type: input.attributeType,
      p_category_id: input.categoryId ?? null,
      p_options: input.options ?? null,
      p_is_filterable: input.isFilterable ?? false,
      p_is_required: input.isRequired ?? false,
      p_sort_order: input.sortOrder ?? 0,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcIdResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد ویژگی' } as ApiError;
    }

    return result.definition_id!;
  }

  async updateDefinition(definitionId: string, input: UpdateAttributeDefinitionInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_attribute_definition', {
      p_definition_id: definitionId,
      p_name: input.name ?? null,
      p_slug: input.slug ?? null,
      p_attribute_type: input.attributeType ?? null,
      p_category_id: input.categoryId ?? null,
      p_options: input.options ?? null,
      p_is_filterable: input.isFilterable ?? null,
      p_is_required: input.isRequired ?? null,
      p_is_active: input.isActive ?? null,
      p_sort_order: input.sortOrder ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش ویژگی' } as ApiError;
    }
  }

  async deleteDefinition(definitionId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_attribute_definition', {
      p_definition_id: definitionId,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف ویژگی' } as ApiError;
    }
  }

  async reorderDefinitions(orderedIds: { id: string; displayOrder: number }[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_attribute_definitions', {
      p_ordered_ids: orderedIds.map((item) => ({ id: item.id, display_order: item.displayOrder })),
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ترتیب‌بندی' } as ApiError;
    }
  }

  async deactivateDefinition(definitionId: string, deactivate: boolean = true): Promise<void> {
    const { data, error } = await this.client.rpc('admin_deactivate_attribute_definition', {
      p_definition_id: definitionId,
      p_deactivate: deactivate,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تغییر وضعیت ویژگی' } as ApiError;
    }
  }

  async listAttributeValues(productId?: string, definitionId?: string): Promise<AttributeValueItem[]> {
    const { data, error } = await this.client.rpc('admin_list_attribute_values', {
      p_product_id: productId ?? null,
      p_definition_id: definitionId ?? null,
    });

    if (error) throw normalizeError(error);

    return ((data as AttributeValueRow[]) ?? []).map(mapAttributeValue);
  }

  async setAttributeValue(productId: string, definitionId: string, value: unknown): Promise<void> {
    const { data, error } = await this.client.rpc('admin_set_attribute_value', {
      p_product_id: productId,
      p_definition_id: definitionId,
      p_value: value,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تنظیم مقدار ویژگی' } as ApiError;
    }
  }
}

export const adminAttributeService = new AdminAttributeService();
