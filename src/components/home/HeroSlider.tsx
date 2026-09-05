import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useActiveSlides } from '@/hooks/useSlideshow';
import type { Slide } from '@/services/slideshow.service';

const AUTOPLAY_INTERVAL = 5000;

function SlideContent({ slide, isMobile, eager }: { slide: Slide; isMobile: boolean; eager: boolean }) {
  const imageUrl = isMobile && slide.mobile_image_url
    ? slide.mobile_image_url
    : slide.desktop_image_url;

  const hasContent = Boolean(slide.title || slide.subtitle || slide.cta_text);
  const dest = slide.destination_url || '#';
  const isLink = dest !== '#';

  const Wrapper = isLink ? 'a' : 'div';
  const linkProps = isLink ? { href: dest } : {};

  return (
    <Wrapper
      {...linkProps}
      className={`relative block w-full h-full group/slide ${isLink ? 'cursor-pointer' : ''}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={slide.title ?? slide.subtitle ?? 'اسلاید'}
          className="absolute inset-0 w-full h-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          fetchPriority={eager ? 'high' : 'auto'}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800" />
      )}

      {/* Gradient overlay for text readability */}
      {hasContent && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      )}

      {/* Slide content */}
      {hasContent && (
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8">
          <div className="max-w-lg space-y-1.5 sm:space-y-2">
            {slide.title && (
              <h3 className="text-white font-extrabold text-base sm:text-xl lg:text-2xl leading-tight drop-shadow-md">
                {slide.title}
              </h3>
            )}
            {slide.subtitle && (
              <p className="text-white/90 text-xs sm:text-sm lg:text-base leading-relaxed drop-shadow-sm line-clamp-2">
                {slide.subtitle}
              </p>
            )}
            {slide.cta_text && (
              <span className="inline-flex items-center mt-1.5 sm:mt-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/95 text-primary-700 text-xs sm:text-sm font-bold shadow-md transition-transform group-hover/slide:scale-105">
                {slide.cta_text}
              </span>
            )}
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export function HeroSlider() {
  const { data: slides, isLoading } = useActiveSlides();
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const activeSlides = slides ?? [];
  const count = activeSlides.length;

  const goNext = useCallback(() => {
    setCurrent((p) => (count <= 1 ? 0 : (p + 1) % count));
  }, [count]);

  const goPrev = useCallback(() => {
    setCurrent((p) => (count <= 1 ? 0 : (p - 1 + count) % count));
  }, [count]);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
  }, []);

  // Autoplay
  useEffect(() => {
    if (count <= 1 || reducedMotion) return;
    timerRef.current = setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, reducedMotion, goNext]);

  // Reset current when slides change
  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2">
        <div className="rounded-xl sm:rounded-2xl bg-neutral-100 animate-pulse aspect-[9/2] sm:aspect-[7/2]" />
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-3 sm:pb-4">
      <div
        className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-lg bg-neutral-100"
        onMouseEnter={() => { if (timerRef.current) clearInterval(timerRef.current); }}
        onMouseLeave={() => {
          if (count > 1 && !reducedMotion) {
            timerRef.current = setInterval(goNext, AUTOPLAY_INTERVAL);
          }
        }}
      >
        {/* Slides container — reduced by 1/3: desktop 7:2, mobile 9:2 */}
        <div className="relative aspect-[9/2] sm:aspect-[7/2]">
          {activeSlides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <SlideContent slide={slide} isMobile={isMobile} eager={idx === 0} />
            </div>
          ))}
        </div>

        {/* Prev / Next controls */}
        {count > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
              aria-label="اسلاید قبلی"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
              aria-label="اسلاید بعدی"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700" />
            </button>
          </>
        )}

        {/* Pagination indicators */}
        {count > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === current
                    ? 'w-6 bg-white shadow-sm'
                    : 'w-1.5 bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`اسلاید ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
