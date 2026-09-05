import { HomeIntro } from '@/components/home/HomeIntro';
import { HeroSlider } from '@/components/home/HeroSlider';
import { HomeHeroAuction } from '@/components/home/HomeHeroAuction';
import { HomeAdRail } from '@/components/home/HomeAdRail';
import { QuickAccessGrid } from '@/components/home/QuickAccessGrid';
import { AuctionHall } from '@/components/home/AuctionHall';
import { HomeSection } from '@/components/home/HomeSection';
import { SupportButton } from '@/components/home/SupportButton';
import { AdSlot } from '@/components/ads/AdSlot';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { BRAND_NAME } from '@/config/brand';
import { homeAdSlotKeys } from '@/config/home-sections';

interface AuctionTitleConfig {
  title: string;
}

export function HomePage() {
  const { data: titleConfig } = useSiteSetting<AuctionTitleConfig>(
    'homepage_auction_title',
    { title: `مزایده آنلاین ${BRAND_NAME}` },
  );
  const auctionTitle = titleConfig?.title ?? `مزایده آنلاین ${BRAND_NAME}`;

  return (
    <div className="animate-fade-in">
      {/* Intro */}
      <HomeIntro />

      {/* Slideshow */}
      <HeroSlider />

      {/* Quick Access — heading hidden on public homepage, managed via Admin */}
      <HomeSection className="pt-1 pb-1 sm:pt-2 sm:pb-2">
        <QuickAccessGrid />
      </HomeSection>

      {/* Auction hero + ads */}
      <section className="relative overflow-hidden bg-primary-50/40">
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-primary-400" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-600" />
            </span>
            <h1 className="text-sm sm:text-base sm:text-lg font-extrabold text-neutral-800">
              {auctionTitle}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-3 sm:gap-4">
            <HomeHeroAuction />
            <div className="hidden lg:block">
              <HomeAdRail />
            </div>
          </div>

          {/* Mobile ad rail */}
          <div className="lg:hidden mt-3 sm:mt-4 flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1">
            {homeAdSlotKeys.map((key) => (
              <div key={key} className="min-w-[120px] sm:min-w-[140px] flex-shrink-0">
                <AdSlot slotKey={key} device="mobile" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auction Hall */}
      <div className="bg-white/60">
        <AuctionHall />
      </div>

      {/* Support */}
      <SupportButton />
    </div>
  );
}
