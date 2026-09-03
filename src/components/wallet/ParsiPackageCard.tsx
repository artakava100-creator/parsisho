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
    <div className="relative flex flex-col items-center text-center p-5 rounded-xl bg-surface-raised border border-neutral-200 group transition-all duration-normal hover:border-primary-300 hover:shadow-md">
      {hasBonus && (
        <div className="absolute -top-3 right-4 z-10">
          <Badge tone="success" variant="solid" className="text-[10px] px-2.5 py-1 shadow-md">
            <Gift className="w-3 h-3" />
            {toPersianDigits(pkg.bonusAmount.toLocaleString('en-US'))} بونوس
          </Badge>
        </div>
      )}

      <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
        <WalletIcon className="w-6 h-6 text-primary-600" />
      </div>

      <p className="text-2xl font-extrabold text-neutral-800 font-num mb-1">
        {formatNumber(pkg.parsiAmount)}
      </p>
      <p className="text-xs text-neutral-500 mb-1">پارسی</p>

      {hasBonus && (
        <p className="text-xs text-success-600 font-medium mb-2">
          مجموع: {formatNumber(totalAmount)} پارسی
        </p>
      )}

      <div className="w-full my-3 border-t border-neutral-200/50" />

      <p className="text-sm text-neutral-500 mb-1">مبلغ پرداختی</p>
      <p className="text-base font-bold text-neutral-700 font-num mb-4">
        {formatNumber(pkg.price)} <span className="text-xs font-normal text-neutral-500">پارسی</span>
      </p>

      <Button variant="primary" fullWidth size="sm" onClick={onPurchase} disabled={disabled}>
        <CreditCard className="w-4 h-4" />
        شارژ کیف پول
      </Button>
    </div>
  );
}
