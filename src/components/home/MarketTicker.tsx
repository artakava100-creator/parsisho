import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';

interface MarketItem {
  name: string;
  price: string;
  unit: string;
  change: number;
}

const MARKET_ITEMS: MarketItem[] = [
  // Gold & Coins
  { name: 'طلا ۱۸ عیار', price: '۴٬۵۲۰٬۰۰۰', unit: 'تومان', change: 1.53 },
  { name: 'سکه امامی', price: '۴۵٬۲۰۰٬۰۰۰', unit: 'تومان', change: 0.91 },
  { name: 'مثقال طلا', price: '۳۵٬۴۰۰٬۰۰۰', unit: 'تومان', change: 1.12 },
  { name: 'سکه بهار آزادی', price: '۴۳٬۸۰۰٬۰۰۰', unit: 'تومان', change: 0.74 },
  { name: 'طلای آب‌شده', price: '۴٬۴۸۰٬۰۰۰', unit: 'تومان', change: 1.38 },
  { name: 'انس طلا', price: '۲٬۴۸۰', unit: 'دلار', change: 0.62 },
  { name: 'انس نقره', price: '۲۹٫۸', unit: 'دلار', change: -0.43 },
  { name: 'پلاتین', price: '۹۸۵', unit: 'دلار', change: 0.28 },
  // Major Currencies
  { name: 'دلار آمریکا', price: '۶۰٬۲۵۰', unit: 'تومان', change: 0.82 },
  { name: 'یورو', price: '۶۵٬۴۸۰', unit: 'تومان', change: -0.31 },
  { name: 'پوند انگلیس', price: '۷۶٬۱۲۰', unit: 'تومان', change: 0.54 },
  { name: 'درهم امارات', price: '۱۶٬۳۸۰', unit: 'تومان', change: -0.12 },
  { name: 'لیر ترکیه', price: '۱٬۸۵۰', unit: 'تومان', change: -1.24 },
  { name: 'یوان چین', price: '۸٬۲۱۰', unit: 'تومان', change: 0.19 },
  { name: 'ین ژاپن', price: '۴۱۰', unit: 'تومان', change: 0.07 },
  { name: 'روبل روسیه', price: '۶۸۰', unit: 'تومان', change: -0.45 },
  { name: 'دلار کانادا', price: '۴۴٬۸۰۰', unit: 'تومان', change: 0.33 },
  { name: 'دلار استرالیا', price: '۴۰٬۱۰۰', unit: 'تومان', change: -0.22 },
  { name: 'فرانک سوئیس', price: '۶۸٬۹۰۰', unit: 'تومان', change: 0.15 },
  { name: 'کرون سوئد', price: '۵٬۸۰۰', unit: 'تومان', change: -0.08 },
  // Cryptocurrencies
  { name: 'بیت‌کوین', price: '۴٬۱۸۰٬۰۰۰٬۰۰۰', unit: 'تومان', change: -2.14 },
  { name: 'اتریوم', price: '۱۴۸٬۵۰۰٬۰۰۰', unit: 'تومان', change: 3.27 },
  { name: 'تتر', price: '۶۰٬۵۰۰', unit: 'تومان', change: -0.05 },
  { name: 'بایننس کوین', price: '۱۲٬۸۰۰٬۰۰۰', unit: 'تومان', change: 0.67 },
  { name: 'سولانا', price: '۸۲۰٬۰۰۰', unit: 'تومان', change: 2.43 },
  { name: 'ریپل', price: '۱۸٬۹۰۰', unit: 'تومان', change: -1.08 },
  { name: 'کاردانو', price: '۲٬۸۵۰', unit: 'تومان', change: 1.76 },
  { name: 'دوج کوین', price: '۱۰٬۲۵۰', unit: 'تومان', change: 4.61 },
  { name: 'آوالانچ', price: '۱٬۲۴۰٬۰۰۰', unit: 'تومان', change: -0.92 },
  { name: 'پالیگان', price: '۸٬۹۰۰', unit: 'تومان', change: 0.54 },
  { name: 'چین لینک', price: '۲۸٬۵۰۰', unit: 'تومان', change: 1.23 },
  { name: 'ترون', price: '۶٬۸۵۰', unit: 'تومان', change: 0.11 },
];

function MarketCell({ item }: { item: MarketItem }) {
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

export function MarketTicker() {
  const items = [...MARKET_ITEMS, ...MARKET_ITEMS, ...MARKET_ITEMS];

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
            <span className="text-[10px] sm:text-xs font-medium">آخرین بروزرسانی: اکنون</span>
          </div>
        </div>

        {/* Ticker strip */}
        <div className="relative overflow-hidden group rounded-xl bg-white border border-neutral-200/60 shadow-sm">
          {/* Edge fade masks */}
          <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-l from-white via-white/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-ticker-scroll group-hover:[animation-play-state:paused] py-2.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center shrink-0">
                <MarketCell item={item} />
                <div className="h-9 w-px bg-neutral-200/70 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
