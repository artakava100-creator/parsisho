import { HomeHeroAuction } from '@/components/home/HomeHeroAuction';
import { HomeAdRail } from '@/components/home/HomeAdRail';
import { QuickAccessGrid } from '@/components/home/QuickAccessGrid';
import { AuctionHall } from '@/components/home/AuctionHall';
import { HomeSection } from '@/components/home/HomeSection';
import { SupportButton } from '@/components/home/SupportButton';
import { AdSlot } from '@/components/ads/AdSlot';
import { BRAND_NAME } from '@/config/brand';
import { homeAdSlotKeys } from '@/config/home-sections';

export function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* ─── HERO: Auction + 3 Ad Placements ─── */}
      <section className="relative bg-gradient-to-b from-primary-50/60 via-surface to-surface overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[400px] h-[300px] bg-primary-100/40 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-accent-100/20 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          {/* Section label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-primary-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600" />
            </span>
            <h1 className="text-sm font-bold text-neutral-700">
              مزایده آنلاین {BRAND_NAME}
            </h1>
          </div>

          {/* Grid: Auction hero + 3 ad slots */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
            <HomeHeroAuction />
            <div className="hidden lg:block">
              <HomeAdRail />
            </div>
          </div>

          {/* Mobile ad rail — horizontal scroll */}
          <div className="lg:hidden mt-4 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {homeAdSlotKeys.map((key) => (
              <div key={key} className="min-w-[140px] flex-shrink-0">
                <AdSlot slotKey={key} device="mobile" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUICK ACCESS ─── */}
      <HomeSection title="دسترسی سریع" className="py-6">
        <QuickAccessGrid />
      </HomeSection>

      {/* ─── AUCTION HALL ─── */}
      <AuctionHall />

      {/* ─── SUPPORT ─── */}
      <SupportButton />
    </div>
  );
}
