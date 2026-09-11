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
    <section className="py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {banners.map((banner, idx) => {
            const Wrapper = banner.link_url ? 'a' : 'div';
            const linkProps = banner.link_url
              ? { href: banner.link_url, target: '_blank', rel: 'noopener noreferrer' }
              : {};

            return (
              <div
                key={idx}
                className="rounded-lg sm:rounded-xl overflow-hidden bg-neutral-50 border border-neutral-200/60 shadow-sm transition-shadow hover:shadow-md"
              >
                <Wrapper
                  {...linkProps}
                  className={`block w-full h-full ${banner.link_url ? 'cursor-pointer' : ''}`}
                >
                  <img
                    src={banner.image_url}
                    alt={`اسپانسر ${idx + 1}`}
                    className="w-full h-full object-contain aspect-[3/2]"
                    loading="lazy"
                    decoding="async"
                  />
                </Wrapper>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
