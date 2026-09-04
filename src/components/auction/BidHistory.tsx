import { Gavel, Crown } from 'lucide-react';
import { formatToman, toPersianDigits } from '@/lib/persian';
import { formatRelativeTime } from '@/lib/jalali';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BidHistoryEntry } from '@/types';

interface BidHistoryProps {
  bids: BidHistoryEntry[];
}

export function BidHistory({ bids }: BidHistoryProps) {
  if (bids.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="هنوز کلیکی ثبت نشده"
          description="اولین نفر باشید که در این مزایده کلیک می‌کند"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="flex items-center justify-between text-xs text-neutral-600 px-3 pb-2 border-b border-neutral-200">
        <span>کلیک‌کننده</span>
        <div className="flex items-center gap-6">
          <span>مبلغ</span>
          <span>زمان</span>
        </div>
      </div>

      {/* Bid entries — realtime activity feed style */}
      <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
        {bids.map((bid, idx) => {
          const isHighest = idx === 0 && !bid.isWinning;
          return (
            <div
              key={bid.id}
              className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all animate-fade-in ${
                bid.isWinning
                  ? 'bg-success-50 border border-success-500/30'
                  : isHighest
                    ? 'bg-primary-500/5 border border-primary-500/20'
                    : 'bg-surface-overlay/30 border border-transparent'
              }`}
            >
              {/* Left: bidder info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs text-neutral-600 tabular-nums shrink-0 w-6 text-center">
                  {toPersianDigits(String(bids.length - idx).padStart(2, '0'))}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {bid.isWinning && (
                    <Crown className="w-3.5 h-3.5 text-success-600 shrink-0" />
                  )}
                  <span className={`text-sm truncate ${
                    bid.isOwnBid
                      ? 'text-primary-700 font-semibold'
                      : bid.isWinning
                        ? 'text-success-700 font-medium'
                        : 'text-neutral-600'
                  }`}>
                    {bid.bidderName}
                    {bid.isOwnBid && ' (شما)'}
                  </span>
                </div>
                {bid.isWinning && (
                  <span className="text-xs text-success-600 shrink-0 font-medium">برنده</span>
                )}
              </div>

              {/* Right: amount + time */}
              <div className="flex items-center gap-6 shrink-0">
                <span className={`text-sm font-bold tabular-nums ${
                  bid.isOwnBid
                    ? 'text-primary-700'
                    : bid.isWinning
                      ? 'text-success-700'
                      : 'text-neutral-700'
                }`}>
                  {formatToman(bid.amount)}
                </span>
                <span className="text-xs text-neutral-600 w-20 text-left">
                  {formatRelativeTime(new Date(bid.createdAt))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
