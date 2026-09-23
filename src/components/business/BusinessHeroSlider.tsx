import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useActiveBusinessSlides } from '@/hooks/useBusinessSlides';
import { SlideRenderer } from './SlideRenderer';
import { cn } from '@/lib/cn';

export function BusinessHeroSlider() {
  const { data: slides, isLoading } = useActiveBusinessSlides();
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

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

  const currentDuration = activeSlides[current]?.durationMs ?? 6000;

  useEffect(() => {
    if (count <= 1 || reducedMotion) return;
    timerRef.current = setInterval(goNext, currentDuration);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, reducedMotion, goNext, currentDuration]);

  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="rounded-xl sm:rounded-2xl bg-neutral-100 animate-pulse h-[200px] sm:h-[280px] lg:h-[320px]" />
      </section>
    );
  }

  if (count === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2 sm:pb-3">
      <div
        className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-lg bg-neutral-100"
        onMouseEnter={() => {
          if (timerRef.current) clearInterval(timerRef.current);
        }}
        onMouseLeave={() => {
          if (count > 1 && !reducedMotion) {
            timerRef.current = setInterval(goNext, currentDuration);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative h-[200px] sm:h-[280px] lg:h-[320px]">
          {activeSlides.map((slide, idx) => (
            <div
              key={slide.id}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-out',
                idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
              )}
            >
              <SlideRenderer
                slide={slide}
                isActive={idx === current}
                isMobile={isMobile}
                eager={idx === 0}
                reducedMotion={reducedMotion}
              />
            </div>
          ))}
        </div>

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

        {count > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  idx === current
                    ? 'w-6 bg-white shadow-sm'
                    : 'w-1.5 bg-white/50 hover:bg-white/70',
                )}
                aria-label={`اسلاید ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
