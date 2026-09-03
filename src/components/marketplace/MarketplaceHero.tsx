import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';

export function MarketplaceHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-primary-800 via-primary-700 to-primary-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:py-16 flex flex-col items-start gap-5 max-w-2xl">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-primary-100">
          <Search className="w-3 h-3" />
          بازار پارسیشو
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
          محصولات اصل با
          <span className="text-accent-400"> بهترین قیمت</span>
        </h1>

        <p className="text-sm sm:text-base text-primary-200 leading-relaxed max-w-lg">
          خرید مستقیم از بازار پارسیشو با ضمانت اصالت کالا و ارسال سریع به سراسر ایران
        </p>

        <Link
          to="#products"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-400 active:bg-accent-600 text-neutral-900 font-bold text-sm px-5 py-3 rounded-xl transition-all duration-200 active:scale-95"
        >
          مشاهده محصولات
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
