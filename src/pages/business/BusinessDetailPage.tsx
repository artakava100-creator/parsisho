import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Globe, Star, ArrowRight, AlertCircle, Tag,
  ChevronLeft, ChevronRight, Info, GalleryHorizontalEnd,
  Clock, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { BackButton } from '@/components/ui/BackButton';
import { useBusinessBySlug } from '@/hooks/useBusinesses';
import { env } from '@/config/env';
import { formatJalaliShort } from '@/lib/jalali';
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

const TABS = [
  { key: 'about', label: 'درباره', icon: Info },
  { key: 'gallery', label: 'گالری', icon: GalleryHorizontalEnd },
  { key: 'contact', label: 'تماس', icon: MapPin },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading, error } = useBusinessBySlug(slug);
  const [activeTab, setActiveTab] = useState<TabKey>('about');

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
  const isFeatured = business.subscriptionType === 'featured' &&
    business.subscriptionExpiresAt && new Date(business.subscriptionExpiresAt) > new Date();

  return (
    <div className="animate-fade-in pb-24 sm:pb-12">
      {/* Cover */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <BackButton label="بازگشت به کسب‌وکارها" className="mb-3" />

        <div className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-[3/1] rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-300 to-neutral-500">
          {coverUrl ? (
            <img src={coverUrl} alt={business.name} className="w-full h-full object-cover" />
          ) : galleryImages.length > 0 ? (
            <img src={galleryImages[0]} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {isFeatured && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-lg">
                <Star className="w-3.5 h-3.5 fill-current" />
                کسب‌وکار ویژه
              </span>
            </div>
          )}
        </div>

        {/* Logo + name overlay */}
        <div className="flex items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12 px-2 sm:px-4 relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-50">
                <Building2 className="w-8 h-8 text-primary-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1 sm:pb-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 truncate">{business.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 mt-6">
        {business.shortDescription && (
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mb-5">
            {business.shortDescription}
          </p>
        )}

        {/* Subscription banner */}
        {isFeatured && business.subscriptionExpiresAt && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl mb-5 text-sm text-amber-700">
            <Sparkles className="w-4 h-4" />
            <span>این کسب‌وکار تا {formatJalaliShort(new Date(business.subscriptionExpiresAt))} اشتراک ویژه دارد.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-200 mb-5 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const showTab = tab.key !== 'gallery' || galleryImages.length > 0;
            if (!showTab) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.key === 'gallery' && galleryImages.length > 0 && (
                  <span className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">
                    {galleryImages.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'about' && (
          <div className="space-y-4 animate-fade-in">
            {business.description ? (
              <Card className="p-4 sm:p-6">
                <h2 className="text-sm font-bold text-neutral-800 mb-3">درباره {business.name}</h2>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                  {business.description}
                </p>
              </Card>
            ) : business.shortDescription ? (
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-neutral-600 leading-relaxed">{business.shortDescription}</p>
              </Card>
            ) : (
              <Card className="p-4 sm:p-6 text-center">
                <p className="text-sm text-neutral-400">اطلاعات بیشتری برای این کسب‌وکار ثبت نشده است.</p>
              </Card>
            )}

            {/* Quick info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {business.city && (
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="موقعیت" value={`${business.city}${business.locality ? `، ${business.locality}` : ''}`} />
              )}
              {business.start_date && (
                <InfoCard icon={<Clock className="w-4 h-4" />} label="تاریخ شروع" value={formatJalaliShort(new Date(business.start_date))} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'gallery' && galleryImages.length > 0 && (
          <div className="animate-fade-in">
            <Gallery images={galleryImages} name={business.name} />
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="animate-fade-in">
            <Card className="p-4 sm:p-6">
              <h2 className="text-sm font-bold text-neutral-800 mb-4">اطلاعات تماس</h2>
              <div className="space-y-3 sm:space-y-4">
                {business.address && (
                  <ContactRow icon={<MapPin className="w-4 h-4" />} label="آدرس" value={business.address} />
                )}
                {business.phone && (
                  <ContactRow icon={<Phone className="w-4 h-4" />} label="تلفن" value={business.phone} ltr />
                )}
                {business.website && (
                  <ContactRow
                    icon={<Globe className="w-4 h-4" />}
                    label="وب‌سایت"
                    value={business.website}
                    ltr
                    link={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  />
                )}
                {!business.address && !business.phone && !business.website && (
                  <p className="text-sm text-neutral-400">اطلاعات تماسی برای این کسب‌وکار ثبت نشده است.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Sticky CTA bar (mobile) */}
      <div className="fixed bottom-14 lg:bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-2.5 flex items-center gap-2 lg:hidden">
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold transition-colors hover:bg-primary-700"
          >
            <Phone className="w-4 h-4" />
            تماس
          </a>
        )}
        {business.website && (
          <a
            href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold transition-colors hover:bg-neutral-200"
          >
            <Globe className="w-4 h-4" />
            وب‌سایت
          </a>
        )}
        {!business.phone && !business.website && (
          <Link to="/businesses" className="flex-1 text-center text-sm text-neutral-500">
            بازگشت به کسب‌وکارها
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200">
      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-sm font-medium text-neutral-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  ltr,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0 text-primary-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-700 hover:text-primary-800 transition-colors"
            dir={ltr ? 'ltr' : undefined}
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-neutral-700" dir={ltr ? 'ltr' : undefined}>{value}</p>
        )}
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
    <div>
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

        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-neutral-900/60 text-white text-xs font-medium">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

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
