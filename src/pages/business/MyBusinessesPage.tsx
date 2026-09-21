import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Star, Clock, MapPin, Store, Pencil, Sparkles } from 'lucide-react';
import { useMyBusinesses, useUpgradeBusinessFeatured } from '@/hooks/useUserBusiness';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { useWallet } from '@/hooks/useWallet';
import { toPersianDigits } from '@/lib/persian';
import { formatJalaliShort } from '@/lib/jalali';
import { cn } from '@/lib/cn';
import type { UserBusinessRow } from '@/types';

const STATUS_CONFIG = {
  pending: { label: 'در انتظار تأیید', color: 'bg-amber-50 text-amber-700' },
  active: { label: 'فعال', color: 'bg-green-50 text-green-700' },
  inactive: { label: 'غیرفعال', color: 'bg-neutral-100 text-neutral-500' },
} as const;

export function MyBusinessesPage() {
  const { data: businesses, isLoading } = useMyBusinesses();
  const { data: wallet } = useWallet();
  const { data: featuredFee } = useSiteSetting<number>('business_featured_upgrade_fee');
  const upgradeMutation = useUpgradeBusinessFeatured();

  const [upgradeTarget, setUpgradeTarget] = useState<UserBusinessRow | null>(null);

  const balance = wallet?.availableBalance ?? 0;
  const fee = featuredFee ?? 5000;

  const handleUpgrade = async () => {
    if (!upgradeTarget) return;
    try {
      await upgradeMutation.mutateAsync(upgradeTarget.id);
      setUpgradeTarget(null);
    } catch {
      // error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackButton label="بازگشت" />
          </div>
          <Link to="/businesses/register">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              ثبت کسب‌وکار جدید
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">کسب‌وکارهای من</h1>
          <p className="text-sm text-neutral-500">کسب‌وکارهای ثبت‌شده توسط شما و وضعیت آن‌ها</p>
        </div>

        {(!businesses || businesses.length === 0) ? (
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="هنوز کسب‌وکاری ثبت نکرده‌اید"
            description="اولین کسب‌وکار خود را ثبت کنید و در پارسیشو دیده شوید"
            action={
              <Link to="/businesses/register">
                <Button>
                  <Plus className="w-4 h-4" />
                  ثبت کسب‌وکار
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {businesses.map((biz) => {
              const statusCfg = STATUS_CONFIG[biz.status] ?? STATUS_CONFIG.inactive;
              const isFeatured = biz.subscription_type === 'featured' &&
                biz.subscription_expires_at && new Date(biz.subscription_expires_at) > new Date();

              return (
                <div
                  key={biz.id}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Cover */}
                  <div className="h-24 bg-gradient-to-l from-primary-100 to-primary-50 relative">
                    {biz.cover_path && (
                      <img src={biz.cover_path} alt="" className="w-full h-full object-cover" />
                    )}
                    {isFeatured && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" />
                        ویژه
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Logo + name */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0 -mt-8 border-2 border-white">
                        {biz.logo_path ? (
                          <img src={biz.logo_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="w-5 h-5 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/businesses/${biz.slug}`} className="block">
                          <h3 className="text-sm font-bold text-neutral-900 hover:text-primary-700 transition-colors truncate">
                            {biz.name}
                          </h3>
                        </Link>
                        <p className="text-xs text-neutral-400">{biz.category_name}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {biz.short_description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{biz.short_description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mb-3">
                      {biz.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {biz.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatJalaliShort(new Date(biz.created_at))}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                      {!isFeatured && biz.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUpgradeTarget(biz)}
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          ارتقا به ویژه
                        </Button>
                      )}
                      <Link to={`/businesses/${biz.slug}`}>
                        <Button size="sm" variant="ghost">
                          <Pencil className="w-3.5 h-3.5" />
                          مشاهده
                        </Button>
                      </Link>
                    </div>

                    {/* Subscription info */}
                    {isFeatured && biz.subscription_expires_at && (
                      <p className="text-xs text-amber-600 mt-2">
                        اشتراک ویژه تا {formatJalaliShort(new Date(biz.subscription_expires_at))}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upgrade modal */}
        <Modal
          open={!!upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          title="ارتقا به ویژه"
        >
          {upgradeTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                <Sparkles className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-neutral-800">ارتقای «{upgradeTarget.name}» به ویژه</p>
                  <p className="text-xs text-neutral-500">کسب‌وکار شما در لیست‌ها اولویت نمایش می‌گیرد</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600">هزینه ارتقا:</span>
                <span className="text-sm font-bold text-amber-700">{toPersianDigits(fee.toLocaleString('fa-IR'))} پارسی</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600">موجودی کیف پول:</span>
                <span className={cn('text-sm font-bold', balance >= fee ? 'text-green-600' : 'text-red-600')}>
                  {toPersianDigits(balance.toLocaleString('fa-IR'))} پارسی
                </span>
              </div>

              {balance < fee && (
                <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  موجودی کیف پول کافی نیست. لطفاً ابتدا کیف پول خود را شارژ کنید.
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setUpgradeTarget(null)}>
                  انصراف
                </Button>
                <Button
                  onClick={handleUpgrade}
                  isLoading={upgradeMutation.isPending}
                  disabled={balance < fee}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  پرداخت و ارتقا
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
