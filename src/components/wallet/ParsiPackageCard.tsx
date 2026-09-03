import { Wallet as WalletIcon, Gift, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatNumber, toPersianDigits } from '@/lib/persian';
import type { ParsiPackage } from '@/types';

interface Props {
  pkg: ParsiPackage;
  onPurchase: () => void;
  disabled?: boolean;
}

export function ParsiPackageCard({ pkg, onPurchase, disabled }: Props) {
  const hasBonus = pkg.bonusAmount > 0;
  const totalAmount = pkg.parsiAmount + pkg.bonusAmount;

  return (
    <div className="relative flex flex-col items-center text-center p-5 pt-6 rounded-xl bg-surface-raised border border-neutral-200 group transition-all duration-normal hover:border-primary-300 hover:shadow-md">
      {hasBonus && (
        <div className="absolute -top-2.5 right-4 z-10">
          <Badge tone="success" variant="solid" className="text-[10px] px-2.5 py-1 shadow-md">
            <Gift className="w-3 h-3" />
            {toPersianDigits(pkg.bonusAmount.toLocaleString('en-US'))} بونوس
          </Badge>
        </div>
      )}

      {/* Parsi amount — visually dominant */}
      <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-500/15 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
        <WalletIcon className="w-6 h-6 text-primary-600" />
      </div>

      <p className="text-3xl font-extrabold text-neutral-800 font-num leading-none mb-1.5">
        {formatNumber(pkg.parsiAmount)}
      </p>
      <p className="text-xs text-neutral-500 mb-2">پارسی</p>

      {hasBonus && (
        <p className="text-xs text-success-600 font-medium mb-1">
          مجموع: {formatNumber(totalAmount)} پارسی
        </p>
      )}

      <div className="w-full my-3.5 border-t border-neutral-200/60" />

      {/* Payment price in Toman — secondary but clear */}
      <p className="text-xs text-neutral-500 mb-1">مبلغ پرداختی</p>
      <p className="text-lg font-bold text-neutral-700 font-num mb-4">
        {formatNumber(pkg.price)} <span className="text-xs font-normal text-neutral-500">تومان</span>
      </p>

      <Button variant="primary" fullWidth size="sm" onClick={onPurchase} disabled={disabled}>
        <CreditCard className="w-4 h-4" />
        شارژ کیف پول
      </Button>
    </div>
  );
}
