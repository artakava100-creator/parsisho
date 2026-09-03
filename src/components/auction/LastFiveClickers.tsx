import { MousePointerClick, Crown } from 'lucide-react';
import { formatRelativeTime } from '@/lib/jalali';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LastFiveClicker } from '@/types';

interface LastFiveClickersProps {
  clickers: LastFiveClicker[];
}

export function LastFiveClickers({ clickers }: LastFiveClickersProps) {
  if (clickers.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<MousePointerClick className="w-8 h-8" />}
          title="هنوز کلیکی ثبت نشده"
          description="اولین نفر باشید که در این مزایده کلیک می‌کند"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-neutral-600 px-3 pb-2 border-b border-neutral-200">
        <span>آخرین کلیک‌کنندگان</span>
        <span>زمان</span>
      </div>

      <div className="space-y-1.5">
        {clickers.map((clicker, idx) => (
          <div
            key={clicker.userId}
            className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all animate-fade-in ${
              idx === 0
                ? 'bg-primary-50 border border-primary-300'
                : 'bg-surface-overlay/30 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-bold ${
                idx === 0
                  ? 'bg-primary-500/20 text-primary-700'
                  : 'bg-neutral-100 text-neutral-500'
              }`}>
                {idx === 0 ? <Crown className="w-3.5 h-3.5" /> : String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                {clicker.avatarUrl ? (
                  <img src={clicker.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
                ) : null}
                <span className={`text-sm truncate ${
                  clicker.isOwn
                    ? 'text-primary-700 font-semibold'
                    : 'text-neutral-600'
                }`}>
                  {clicker.displayName}
                  {clicker.isOwn && ' (شما)'}
                </span>
              </div>
            </div>
            <span className="text-xs text-neutral-600 shrink-0">
              {formatRelativeTime(new Date(clicker.lastClickAt))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
