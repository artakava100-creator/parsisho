import { useParams, Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Globe, Star, ArrowRight, AlertCircle, Tag,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useBusinessBySlug } from '@/hooks/useBusinesses';
import { env } from '@/config/env';

function getBusinessImageUrl(logoPath: string | null, coverPath: string | null): string | null {
  const path = logoPath ?? coverPath;
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${path}`;
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

  const imageUrl = getBusinessImageUrl(business.logoPath, business.coverPath);

  return (
    <div className="animate-fade-in pb-12">
      {/* Cover */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="aspect-[21/9] sm:aspect-[3/1] rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-400 relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-neutral-700" />
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/businesses" className="text-sm text-neutral-500 hover:text-primary-700 transition-colors">
            محله کسب‌وکار
          </Link>
          <span className="text-neutral-700">/</span>
          <span className="text-sm text-neutral-500">{business.categoryName}</span>
        </div>

        <h1 className="text-2xl font-extrabold text-neutral-800 mb-2">{business.name}</h1>

        <div className="flex flex-wrap items-center gap-2 mb-6">
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
          <p className="text-base text-neutral-600 leading-relaxed mb-6">
            {business.shortDescription}
          </p>
        )}

        {business.description && (
          <Card className="p-5 mb-6">
            <h2 className="text-sm font-bold text-neutral-800 mb-3">درباره کسب‌وکار</h2>
            <p className="text-sm text-neutral-500 leading-relaxed whitespace-pre-line">
              {business.description}
            </p>
          </Card>
        )}

        {/* Contact Info */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-neutral-800 mb-4">اطلاعات تماس</h2>
          <div className="space-y-3">
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
