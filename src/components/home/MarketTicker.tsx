import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';

interface MarketItem {
  name: string;
  price: string;
  change: number;
}

const MARKET_ITEMS: MarketItem[] = [
  { name: 'دلار', price: '۶۰٬۲۵۰', change: 0.82 },
  { name: 'یورو', price: '۶۵٬۴۸۰', change: -0.31 },
  { name: 'پوند', price: '۷۶٬۱۲۰', change: 0.54 },
  { name: 'درهم', price: '۱۶٬۳۸۰', change: -0.12 },
  { name: 'لیر', price: '۱٬۸۵۰', change: -1.24 },
  { name: 'یوان', price: '۸٬۲۱۰', change: 0.19 },
  { name: 'طلا ۱۸ عیار', price: '۴٬۵۲۰٬۰۰۰', change: 1.53 },
  { name: 'سکه امامی', price: '۴۵٬۲۰۰٬۰۰۰', change: 0.91 },
  { name: 'بیت‌کوین', price: '۴٬۱۸۰٬۰۰۰٬۰۰۰', change: -2.14 },
  { name: 'اتریوم', price: '۱۴۸٬۵۰۰٬۰۰۰', change: 3.27 },
];

function MarketCell({ item }: { item: MarketItem }) {
  const isUp = item.change > 0;
  const isDown = item.change < 0;
  const isNeutral = item.change === 0;

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const changeColor = isUp
    ? 'text-success-600'
    : isDown
      ? 'text-error-600'
      : 'text-neutral-400';
  const iconColor = isUp
    ? 'text-success-500'
    : isDown
      ? 'text-error-500'
      : 'text-neutral-400';
  const changeBg = isUp
    ? 'bg-success-50'
    : isDown
      ? 'bg-error-50'
      : 'bg-neutral-100';

  const changeStr = (isUp ? '+' : isDown ? '−' : '') + toPersianDigits(Math.abs(item.change).toFixed(2)) + '٪';

  return (
    <div className="flex items-center gap-2.5 px-4 sm:px-5 shrink-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs sm:text-sm font-bold text-neutral-700 leading-tight">{item.name}</span>
        <span className="text-[11px] sm:text-xs font-num text-neutral-500 leading-tight">
          {item.price} <span className="text-neutral-400">تومان</span>
        </span>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${changeBg}`}>
        <Icon className={`w-3 h-3 ${iconColor}`} />
        <span className={`text-[11px] sm:text-xs font-bold font-num ${changeColor} leading-none`}>
          {changeStr}
        </span>
      </div>
    </div>
  );
}

export function MarketTicker() {
  const items = [...MARKET_ITEMS, ...MARKET_ITEMS];

  return (
    <section className="bg-white/60 border-y border-neutral-200/70">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Heading row */}
        <div className="flex items-center justify-between mb-2.5 sm:mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-success-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
            </span>
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-700">نرخ ارزها لحظه‌ای</h2>
          </div>
          <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">
            آخرین بروزرسانی: اکنون
          </span>
        </div>

        {/* Ticker strip */}
        <div className="relative overflow-hidden group">
          {/* Edge fade masks */}
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-ticker-scroll group-hover:[animation-play-state:paused]">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center shrink-0">
                <MarketCell item={item} />
                <div className="h-7 w-px bg-neutral-200/70 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
