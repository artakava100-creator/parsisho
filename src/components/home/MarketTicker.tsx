import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Coins, DollarSign, Bitcoin } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';
import { useMarketPrices, type MarketPrice } from '@/hooks/useMarketPrices';
import { Skeleton } from '@/components/ui/Skeleton';

interface DisplayItem {
  name: string;
  price: string;
  unit: string;
  change: number;
  category: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Coins }> = {
  gold: { label: 'طلا و سکه', icon: Coins },
  currency: { label: 'ارزها', icon: DollarSign },
  crypto: { label: 'ارز دیجیتال', icon: Bitcoin },
};

function formatPrice(value: number): string {
  if (value >= 1_000_000_000) {
    return toPersianDigits((value / 1_000_000_000).toFixed(2)) + ' میلیارد';
  }
  if (value >= 1_000_000) {
    return toPersianDigits((value / 1_000_000).toFixed(1)) + ' میلیون';
  }
  return toPersianDigits(Math.round(value).toLocaleString('en-US'));
}

function MarketCell({ item }: { item: DisplayItem }) {
  const isUp = item.change > 0;
  const isDown = item.change < 0;

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const changeColor = isUp
    ? 'text-success-700'
    : isDown
      ? 'text-error-700'
      : 'text-neutral-500';
  const iconColor = isUp
    ? 'text-success-600'
    : isDown
      ? 'text-error-600'
      : 'text-neutral-400';
  const changeBg = isUp
    ? 'bg-success-50 border border-success-200/50'
    : isDown
      ? 'bg-error-50 border border-error-200/50'
      : 'bg-neutral-100 border border-neutral-200/50';

  const changeStr = (isUp ? '+' : isDown ? '−' : '') + toPersianDigits(Math.abs(item.change).toFixed(2)) + '٪';

  return (
    <div className="flex items-center gap-3 px-5 sm:px-6 shrink-0">
      <div className="flex flex-col gap-1">
        <span className="text-sm sm:text-base font-bold text-neutral-800 leading-tight">{item.name}</span>
        <span className="text-xs sm:text-sm font-num text-neutral-600 leading-tight">
          {item.price} <span className="text-neutral-400 text-[10px] sm:text-xs">{item.unit}</span>
        </span>
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${changeBg}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className={`text-xs sm:text-sm font-bold font-num ${changeColor} leading-none`}>
          {changeStr}
        </span>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const info = CATEGORY_LABELS[category];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div className="flex items-center gap-1.5 px-3 shrink-0 bg-primary-50/80 rounded-lg mx-1">
      <Icon className="w-4 h-4 text-primary-600" />
      <span className="text-xs font-bold text-primary-700 whitespace-nowrap">{info.label}</span>
    </div>
  );
}

function TickerSkeleton() {
  return (
    <section className="bg-gradient-to-b from-white to-neutral-50/60 border-y border-neutral-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-success-400" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-500" />
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-neutral-800">نرخ ارزها لحظه‌ای</h2>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-neutral-200/60 shadow-sm py-3">
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </section>
  );
}

export function MarketTicker() {
  const { data: prices, isLoading, isError } = useMarketPrices();

  const displayItems = useMemo<DisplayItem[]>(() => {
    if (!prices || prices.length === 0) return [];

    const items: DisplayItem[] = [];
    let currentCategory = '';

    for (const p of prices) {
      if (p.category !== currentCategory) {
        currentCategory = p.category;
        // We don't add the badge here — it's rendered inline in the ticker
      }
      items.push({
        name: p.name_fa,
        price: formatPrice(Number(p.price)),
        unit: p.unit,
        change: Number(p.change_percent),
        category: p.category,
      });
    }
    return items;
  }, [prices]);

  // Build ticker content: category badge before each group, then items
  const tickerContent = useMemo(() => {
    if (displayItems.length === 0) return [];

    const segments: { type: 'badge' | 'item'; category: string; item?: DisplayItem }[] = [];
    let lastCategory = '';

    for (const item of displayItems) {
      if (item.category !== lastCategory) {
        segments.push({ type: 'badge', category: item.category });
        lastCategory = item.category;
      }
      segments.push({ type: 'item', category: item.category, item });
    }
    return segments;
  }, [displayItems]);

  const lastUpdate = useMemo(() => {
    if (!prices || prices.length === 0) return null;
    const latest = prices.reduce((max, p) => {
      const ts = new Date(p.updated_at).getTime();
      return ts > max ? ts : max;
    }, 0);
    if (!latest) return null;
    const diff = Math.round((Date.now() - latest) / 1000);
    if (diff < 60) return 'لحظاتی پیش';
    if (diff < 3600) return toPersianDigits(Math.floor(diff / 60)) + ' دقیقه پیش';
    return toPersianDigits(Math.floor(diff / 3600)) + ' ساعت پیش';
  }, [prices]);

  // Fallback to static data if fetch fails
  const hasData = displayItems.length > 0;

  if (isLoading && !hasData) return <TickerSkeleton />;

  if (isError && !hasData) {
    return (
      <section className="bg-gradient-to-b from-white to-neutral-50/60 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 text-center text-sm text-neutral-400">
          نرخ‌ها در حال حاضر در دسترس نیست
        </div>
      </section>
    );
  }

  // Duplicate content exactly twice for seamless infinite loop
  const loopContent = [...tickerContent, ...tickerContent];

  return (
    <section className="bg-gradient-to-b from-white to-neutral-50/60 border-y border-neutral-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* Heading row */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-success-400" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-500" />
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-neutral-800">نرخ ارزها لحظه‌ای</h2>
          </div>
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="text-[10px] sm:text-xs font-medium">
              {lastUpdate ? `آخرین بروزرسانی: ${lastUpdate}` : 'در حال بارگذاری...'}
            </span>
          </div>
        </div>

        {/* Ticker strip — seamless infinite scroll */}
        <div className="relative overflow-hidden group rounded-xl bg-white border border-neutral-200/60 shadow-sm">
          {/* Edge fade masks */}
          <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-l from-white via-white/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-ticker-scroll group-hover:[animation-play-state:paused] py-2.5">
            {loopContent.map((seg, idx) => (
              <div key={idx} className="flex items-center shrink-0">
                {seg.type === 'badge' ? (
                  <CategoryBadge category={seg.category} />
                ) : (
                  <>
                    <MarketCell item={seg.item!} />
                  </>
                )}
                <div className="h-9 w-px bg-neutral-200/70 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
