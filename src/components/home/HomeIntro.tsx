import { BRAND_NAME } from '@/config/brand';

export function HomeIntro() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-primary-50/30 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            <span className="text-xs font-bold text-primary-700">سرزمین {BRAND_NAME}</span>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-neutral-800 leading-relaxed max-w-2xl">
            پلتفرم <span className="text-primary-700">مزایده آنلاین</span>،{' '}
            <span className="text-accent-600">خرید مستقیم</span>، سرگرمی و{' '}
            <span className="text-local-600">اقتصاد محلی</span>
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 max-w-lg leading-relaxed">
            در {BRAND_NAME} با هیجان مزایده خرید کنید، از تخفیف‌های ویژه بهره‌مند شوید و از کسب‌وکارهای محلی حمایت کنید.
          </p>
        </div>
      </div>
    </section>
  );
}
