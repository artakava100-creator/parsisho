import { useState } from 'react';
import { MousePointerClick, AlertCircle, Zap, Wallet } from 'lucide-react';
import { useAuth } from '@/providers/useAuth';
import { useToast } from '@/providers/useToast';
import { usePlaceClick } from '@/hooks/useAuction';
import { getIdentityState, getAuctionEligibilityMessage } from '@/lib/eligibility';
import { formatToman } from '@/lib/persian';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import type { Auction } from '@/types';

interface ClickButtonProps {
  auction: Auction;
}

export function ClickButton({ auction }: ClickButtonProps) {
  const { user } = useAuth();
  const toast = useToast();
  const placeClick = usePlaceClick();
  const [serverError, setServerError] = useState<string | null>(null);

  const identity = getIdentityState(user);
  const isLive = auction.status === 'live' || auction.status === 'ending';
  const isEnded = auction.status === 'ended';
  const isCancelled = auction.status === 'cancelled';

  if (!isLive) {
    if (isEnded) {
      return (
        <div className="p-4 rounded-xl bg-neutral-100/50 border border-neutral-300 text-center">
          <p className="text-sm text-neutral-500">مزایده به پایان رسیده است</p>
        </div>
      );
    }
    if (isCancelled) {
      return (
        <div className="p-4 rounded-xl bg-error-50 border border-error-200 text-center">
          <p className="text-sm text-error-700">این مزایده لغو شده است</p>
        </div>
      );
    }
    return (
      <div className="p-4 rounded-xl bg-neutral-100/50 border border-neutral-300 text-center">
        <p className="text-sm text-neutral-500">مزایده هنوز شروع نشده است</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 rounded-xl bg-secondary-500/10 border border-secondary-500/30 text-center">
        <p className="text-sm text-secondary-700">برای کلیک در مزایده وارد حساب خود شوید</p>
      </div>
    );
  }

  if (!identity.isAuctionEligible) {
    return (
      <div className="p-4 rounded-xl bg-warning-50 border border-warning-500/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
          <p className="text-sm text-warning-700">{getAuctionEligibilityMessage(user)}</p>
        </div>
      </div>
    );
  }

  const handleClick = async () => {
    setServerError(null);

    try {
      const result = await placeClick.mutateAsync({ auctionId: auction.id });
      if (result.success) {
        if (result.extensionApplied) {
          toast.success('کلیک ثبت شد + تمدید زمان!', `قیمت: ${formatToman(result.newCurrentPrice!)} — زمان مزایده ۱۰ ثانیه تمدید شد`);
        } else {
          toast.success('کلیک شما ثبت شد', `قیمت جدید: ${formatToman(result.newCurrentPrice!)}`);
        }
      } else if (result.error) {
        setServerError(result.error);
        toast.error('خطا در ثبت کلیک', result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت کلیک';
      setServerError(msg);
      toast.error('خطا در ثبت کلیک', msg);
    }
  };

  return (
    <div className="space-y-2.5">
      {serverError && (
        <div
          className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <Button
        variant="primary"
        fullWidth
        size="lg"
        loading={placeClick.isPending}
        onClick={handleClick}
        disabled={placeClick.isPending}
        className="relative overflow-hidden"
      >
        {!placeClick.isPending && <MousePointerClick className="w-5 h-5" />}
        {placeClick.isPending ? 'در حال ثبت...' : 'کلیک کن'}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
        <Wallet className="w-3.5 h-3.5" />
        <span>هزینه هر کلیک: {formatToman(auction.clickCost)}</span>
      </div>

      {serverError && serverError.includes('موجودی') && (
        <Link to="/wallet" className="block">
          <Button variant="outline" fullWidth size="sm">
            <Wallet className="w-4 h-4" />
            شارژ کیف پول
          </Button>
        </Link>
      )}

      {auction.extensionUsed && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning-50 border border-warning-500/20">
          <Zap className="w-3.5 h-3.5 text-warning-600 shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-500">
            تمدید ۱۰ ثانیه‌ای مصرف شد — دیگر قابل تمدید نیست
          </p>
        </div>
      )}
    </div>
  );
}
