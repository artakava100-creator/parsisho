import { Wallet as WalletIcon, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/persian';
import type { Wallet } from '@/types';

interface Props {
  wallet: Wallet | null | undefined;
  isLoading: boolean;
}

export function ParsishoBankCard({ wallet, isLoading }: Props) {
  const available = wallet?.availableBalance ?? 0;
  const locked = wallet?.lockedBalance ?? 0;
  const total = available + locked;

  return (
    <div className="relative group animate-fade-in-up">
      <div className="relative rounded-2xl overflow-hidden border border-neutral-300/40 shadow-lg transition-all duration-slow">
        {/* Card surface */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900" />
        {/* Subtle lighting layers */}
        <div className="absolute -top-24 -right-16 w-64 h-64 bg-primary-500/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-20 -left-12 w-48 h-48 bg-primary-400/10 rounded-full blur-[60px]" />
        {/* Sheen line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-7">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">پ</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">پارسیشو</p>
                <p className="text-[10px] text-primary-200/80">بانک پارسیشو</p>
              </div>
            </div>
            {/* Chip */}
            <div className="relative">
              <div className="w-11 h-8 rounded-md bg-gradient-to-br from-primary-300/40 to-primary-500/30 border border-primary-300/30 flex items-center justify-center">
                <div className="w-7 h-5 rounded-sm border border-primary-200/20 grid grid-cols-3 grid-rows-2 gap-px">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-primary-200/15" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <WalletIcon className="w-4 h-4 text-primary-200" />
              <p className="text-xs text-primary-200/80">موجودی قابل استفاده</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-56 bg-primary-600/30" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-num tracking-tight">
                  {formatNumber(available)}
                </span>
                <span className="text-sm font-medium text-primary-200">پارسی</span>
              </div>
            )}
          </div>

          {/* Card number */}
          <div className="mb-6 flex items-center gap-2 font-num text-sm text-primary-200/70 tracking-widest" dir="ltr">
            <span>۶۲۱۹</span>
            <span className="text-primary-300/50">••••</span>
            <span className="text-primary-300/50">••••</span>
            <span>پارسی</span>
          </div>

          {/* Footer stats */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
              <Lock className="w-3.5 h-3.5 text-warning-400" />
              <div>
                <p className="text-[10px] text-primary-200/70">مسدود</p>
                {isLoading ? (
                  <Skeleton className="h-3.5 w-16 mt-0.5 bg-primary-600/30" />
                ) : (
                  <p className="text-xs font-bold text-white font-num">
                    {formatNumber(locked)} <span className="text-primary-300/60 font-normal">پارسی</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
              <WalletIcon className="w-3.5 h-3.5 text-primary-200" />
              <div>
                <p className="text-[10px] text-primary-200/70">کل</p>
                {isLoading ? (
                  <Skeleton className="h-3.5 w-16 mt-0.5 bg-primary-600/30" />
                ) : (
                  <p className="text-xs font-bold text-white font-num">
                    {formatNumber(total)} <span className="text-primary-300/60 font-normal">پارسی</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
