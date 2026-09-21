import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Globe, Star, ArrowRight, AlertCircle, Tag,
  ChevronLeft, ChevronRight, Image as ImageIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useBusinessBySlug } from '@/hooks/useBusinesses';
import { env } from '@/config/env';
import { cn } from '@/lib/cn';

function getLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${logoPath}`;
}

function getCoverUrl(coverPath: string | null): string | null {
  if (!coverPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${coverPath}`;
}

function getGalleryUrl(imagePath: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${imagePath}`;
}

export function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading, error } = useBusinessBySlug(slug);

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          title="خطا در بارگذاری"
          description="اطلاعات کسب‌وکار در حال حاضر قابل دریافت نیست"
          action={
            <Link to="/businesses">
              <Button variant="outline">
                <ArrowRight className="w-4 h-4" />
                بازگشت به محله کسب‌وکار
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="کسب‌وکار پیدا نشد"
          description="کسب‌وکار مورد نظر وجود ندارد یا دیگر فعال نیست"
          action={
            <Link to="/businesses">
              <Button variant="outline">
                <ArrowRight className="w-4 h-4" />
                بازگشت به محله کسب‌وکار
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const logoUrl = getLogoUrl(business.logoPath);
  const coverUrl = getCoverUrl(business.coverPath);
  const galleryImages = business.images?.map((img) => getGalleryUrl(img.imagePath)) ?? [];

  return (
    <div className="animate-fade-in pb-12">
      {/* Cover + Logo */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="aspect-[16/9] sm:aspect-[21/9] lg:aspect-[3/1] rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-400 relative overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt={business.name} className="w-full h-full object-cover" />
          ) : galleryImages.length > 0 ? (
            <img src={galleryImages[0]} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-neutral-700" />
            </div>
          )}
          {logoUrl && (
            <div className="absolute bottom-3 right-3 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-surface shadow-lg bg-surface">
              <img src={logoUrl} alt={business.name} className="w-full h-full object-cover" />
            </div>
          )}
          {business.isFeatured && (
            <div className="absolute top-3 right-3">
              <Badge tone="accent" variant="solid">
                <Star className="w-3 h-3 fill-current" />
                کسب‌وکار ویژه
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Link to="/businesses" className="text-sm text-neutral-500 hover:text-primary-700 transition-colors">
            محله کسب‌وکار
          </Link>
          <span className="text-neutral-700">/</span>
          <span className="text-sm text-neutral-500">{business.categoryName}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-800 mb-2">{business.name}</h1>

        <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
          <Badge tone="primary" variant="soft">
            <Tag className="w-3 h-3" />
            {business.categoryName}
          </Badge>
          {business.city && (
            <Badge tone="neutral" variant="outline">
              <MapPin className="w-3 h-3" />
              {business.city}
              {business.locality && `، ${business.locality}`}
            </Badge>
          )}
        </div>

        {business.shortDescription && (
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mb-4 sm:mb-6">
            {business.shortDescription}
          </p>
        )}

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <Gallery images={galleryImages} name={business.name} />
        )}

        {business.description && (
          <Card className="p-4 sm:p-5 mb-4 sm:mb-6">
            <h2 className="text-sm font-bold text-neutral-800 mb-2.5 sm:mb-3">درباره کسب‌وکار</h2>
            <p className="text-sm text-neutral-500 leading-relaxed whitespace-pre-line">
              {business.description}
            </p>
          </Card>
        )}

        {/* Contact Info */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-bold text-neutral-800 mb-3 sm:mb-4">اطلاعات تماس</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {business.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">آدرس</p>
                  <p className="text-sm text-neutral-700 leading-relaxed">{business.address}</p>
                </div>
              </div>
            )}
            {business.phone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">تلفن</p>
                  <p className="text-sm text-neutral-700" dir="ltr">{business.phone}</p>
                </div>
              </div>
            )}
            {business.website && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">وب‌سایت / شبکه اجتماعی</p>
                  <a
                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-700 hover:text-primary-200 transition-colors"
                    dir="ltr"
                  >
                    {business.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Swipeable Gallery ────────────────────────────────────────────

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    }
    setActiveIndex(clamped);
  }, [images.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const slideWidth = track.clientWidth || 1;
        const idx = Math.round(Math.abs(track.scrollLeft) / slideWidth);
        setActiveIndex(Math.max(0, Math.min(idx, images.length - 1)));
        ticking = false;
      });
    };
    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => track.removeEventListener('scroll', handleScroll);
  }, [images.length]);

  const goPrev = () => scrollToIndex(activeIndex - 1);
  const goNext = () => scrollToIndex(activeIndex + 1);

  return (
    <div className="mb-4 sm:mb-6">
      {/* Main carousel */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 group">
        <div
          ref={trackRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="shrink-0 w-full snap-center aspect-[16/10] sm:aspect-[2/1] relative cursor-pointer"
              onClick={() => setLightbox(i)}
            >
              <img src={src} alt={`${name} - تصویر ${i + 1}`} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={activeIndex === 0}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-neutral-900/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              aria-label="قبلی"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              disabled={activeIndex === images.length - 1}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-neutral-900/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              aria-label="بعدی"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-neutral-900/60 text-white text-xs font-medium">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={cn(
                'shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors',
                activeIndex === i ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[90] bg-neutral-900/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neutral-800/60 text-white flex items-center justify-center"
            aria-label="بستن"
          >
            <span className="text-xl">×</span>
          </button>
          <img
            src={images[lightbox]}
            alt={`${name} - تصویر بزرگ`}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox(Math.max(0, lightbox - 1)); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-800/60 text-white flex items-center justify-center"
                aria-label="قبلی"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox(Math.min(images.length - 1, lightbox + 1)); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-800/60 text-white flex items-center justify-center"
                aria-label="بعدی"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
