import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { Profile, ApiError, UserRole, AccountStatus } from '@/types';

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  role: string;
  reputation_score: number;
  phone_number: string | null;
  phone_verified_at: string | null;
  account_status: string;
  identity_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    city: row.city,
    role: row.role as UserRole,
    reputationScore: row.reputation_score,
    phoneNumber: row.phone_number,
    phoneVerifiedAt: row.phone_verified_at,
    accountStatus: row.account_status as AccountStatus,
    identityVerifiedAt: row.identity_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string | null;
  city?: string | null;
  phone_number?: string | null;
}

export class ProfileService extends BaseService {
  async getByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapProfile(data as ProfileRow);
  }

  async update(userId: string, updates: ProfileUpdate): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) throw { message: 'پروفایل یافت نشد' } as ApiError;
    return mapProfile(data as ProfileRow);
  }
}

export const profileService = new ProfileService();
