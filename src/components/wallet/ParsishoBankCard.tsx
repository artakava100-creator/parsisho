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
    <div className="relative animate-fade-in-up">
      <div className="relative rounded-2xl overflow-hidden border border-primary-900/40 shadow-lg transition-all duration-slow">
        {/* Card surface — deep petroleum blue with subtle vertical variation */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-800 to-primary-900" />
        {/* Restrained lighting — single soft glow upper-right */}
        <div className="absolute -top-20 -right-10 w-56 h-56 bg-primary-500/15 rounded-full blur-[70px]" />
        {/* Fine top sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        {/* Subtle bottom edge highlight */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-300/10 to-transparent" />

        <div className="relative p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center">
                <span className="text-white font-extrabold text-lg leading-none">پ</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">پارسیشو</p>
                <p className="text-[10px] text-primary-200/60 mt-0.5">بانک پارسیشو</p>
              </div>
            </div>
            {/* Chip — refined */}
            <div className="w-11 h-8 rounded-md bg-gradient-to-br from-primary-300/30 to-primary-500/20 border border-primary-300/20 flex items-center justify-center">
              <div className="w-7 h-5 rounded-sm border border-primary-200/15 grid grid-cols-3 grid-rows-2 gap-px">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-primary-200/10" />
                ))}
              </div>
            </div>
          </div>

          {/* Balance — hero of the card */}
          <div className="mb-7">
            <div className="flex items-center gap-1.5 mb-2.5">
              <WalletIcon className="w-3.5 h-3.5 text-primary-200/70" />
              <p className="text-xs text-primary-200/70">موجودی قابل استفاده</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-11 w-56 bg-primary-600/25" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-[2.5rem] font-extrabold text-white font-num tracking-tight leading-none">
                  {formatNumber(available)}
                </span>
                <span className="text-sm font-medium text-primary-200/80">پارسی</span>
              </div>
            )}
          </div>

          {/* Card number */}
          <div className="mb-6 flex items-center gap-2.5 font-num text-sm text-primary-200/50 tracking-[0.2em]" dir="ltr">
            <span>۶۲۱۹</span>
            <span className="text-primary-300/40">••••</span>
            <span className="text-primary-300/40">••••</span>
            <span>پارسی</span>
          </div>

          {/* Footer stats — restrained */}
          <div className="flex items-center gap-2.5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04]">
              <Lock className="w-3.5 h-3.5 text-warning-400/80" />
              <div>
                <p className="text-[10px] text-primary-200/50">مسدود</p>
                {isLoading ? (
                  <Skeleton className="h-3.5 w-14 mt-0.5 bg-primary-600/25" />
                ) : (
                  <p className="text-xs font-bold text-white/90 font-num leading-tight">
                    {formatNumber(locked)} <span className="text-primary-300/50 font-normal">پارسی</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04]">
              <WalletIcon className="w-3.5 h-3.5 text-primary-200/70" />
              <div>
                <p className="text-[10px] text-primary-200/50">کل</p>
                {isLoading ? (
                  <Skeleton className="h-3.5 w-14 mt-0.5 bg-primary-600/25" />
                ) : (
                  <p className="text-xs font-bold text-white/90 font-num leading-tight">
                    {formatNumber(total)} <span className="text-primary-300/50 font-normal">پارسی</span>
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
