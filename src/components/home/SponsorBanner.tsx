import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteSetting } from '@/hooks/useSiteSettings';

interface SponsorBannerItem {
  image_url: string;
  link_url: string;
  visible: boolean;
}

interface SponsorBannerConfig {
  banners: SponsorBannerItem[];
}

const AUTOPLAY_INTERVAL = 5000;

export function SponsorBanner() {
  const { data: config } = useSiteSetting<SponsorBannerConfig>(
    'homepage_sponsor_banners',
    { banners: [] },
  );

  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const banners = (config?.banners ?? []).filter((b) => b.visible && b.image_url);
  const count = banners.length;

  const goNext = useCallback(() => {
    setCurrent((p) => (count <= 1 ? 0 : (p + 1) % count));
  }, [count]);

  const goPrev = useCallback(() => {
    setCurrent((p) => (count <= 1 ? 0 : (p - 1 + count) % count));
  }, [count]);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
  }, []);

  useEffect(() => {
    if (count <= 1 || reducedMotion) return;
    timerRef.current = setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, reducedMotion, goNext]);

  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  if (count === 0) return null;

  return (
    <section className="py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div
          className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-200/60 shadow-sm"
          onMouseEnter={() => { if (timerRef.current) clearInterval(timerRef.current); }}
          onMouseLeave={() => {
            if (count > 1 && !reducedMotion) {
              timerRef.current = setInterval(goNext, AUTOPLAY_INTERVAL);
            }
          }}
        >
          <div className="relative aspect-[7/2] sm:aspect-[8/1]">
            {banners.map((banner, idx) => {
              const Wrapper = banner.link_url ? 'a' : 'div';
              const linkProps = banner.link_url
                ? { href: banner.link_url, target: '_blank', rel: 'noopener noreferrer' }
                : {};

              return (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                    idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <Wrapper
                    {...linkProps}
                    className={`block w-full h-full ${banner.link_url ? 'cursor-pointer' : ''}`}
                  >
                    <img
                      src={banner.image_url}
                      alt={`اسپانسر ${idx + 1}`}
                      className="w-full h-full object-contain"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding={idx === 0 ? 'sync' : 'async'}
                    />
                  </Wrapper>
                </div>
              );
            })}
          </div>

          {count > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
                aria-label="اسپانسر قبلی"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
                aria-label="اسپانسر بعدی"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700" />
              </button>

              <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goTo(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === current
                        ? 'w-6 bg-neutral-700 shadow-sm'
                        : 'w-1.5 bg-neutral-400/50 hover:bg-neutral-400/70'
                    }`}
                    aria-label={`اسپانسر ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
