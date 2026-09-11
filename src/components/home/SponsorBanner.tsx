import { Award } from 'lucide-react';
import { useSiteSetting } from '@/hooks/useSiteSettings';

interface SponsorBannerItem {
  image_url: string;
  link_url: string;
  visible: boolean;
}

interface SponsorBannerConfig {
  banners: SponsorBannerItem[];
}

export function SponsorBanner() {
  const { data: config } = useSiteSetting<SponsorBannerConfig>(
    'homepage_sponsor_banners',
    { banners: [] },
  );

  const banners = (config?.banners ?? []).filter((b) => b.visible && b.image_url);
  if (banners.length === 0) return null;

  return (
    <section className="py-3 sm:py-5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section heading — matches AuctionHall / SpecialSection pattern */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary-100 flex items-center justify-center">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-neutral-800">
              اسپانسر پارسی شو
            </h2>
          </div>
        </div>

        {/* Banner row — always 5 across */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3 lg:gap-4">
          {banners.map((banner, idx) => {
            const Wrapper = banner.link_url ? 'a' : 'div';
            const linkProps = banner.link_url
              ? { href: banner.link_url, target: '_blank', rel: 'noopener noreferrer' }
              : {};

            return (
              <div
                key={idx}
                className="group relative rounded-lg sm:rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/70 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary-300/60 hover:ring-1 hover:ring-primary-200/50"
              >
                <Wrapper
                  {...linkProps}
                  className={`block w-full h-full ${banner.link_url ? 'cursor-pointer' : ''}`}
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <img
                      src={banner.image_url}
                      alt={`اسپانسر ${idx + 1}`}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.04] group-hover:saturate-[1.15] group-hover:brightness-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Subtle glow overlay on hover */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary-900/5 via-transparent to-white/10" />
                  </div>
                </Wrapper>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
