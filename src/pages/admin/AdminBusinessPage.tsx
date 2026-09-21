import { useState, useMemo, useCallback } from 'react';
import {
  Building2, Plus, Edit3, Star, AlertCircle, Search, Trash2,
  Image as ImageIcon, Loader2, X, Upload, MapPin, Phone, Globe,
  ChevronLeft, ChevronRight, Calendar, Clock,
} from 'lucide-react';
import {
  useAdminBusinesses, useAdminBusinessCategories,
  useCreateBusiness, useUpdateBusiness, useDeleteBusiness,
  useAdminBusinessImages, useAddBusinessImage, useDeleteBusinessImage,
  useAdminProvinces, useAdminCities,
} from '@/hooks/useAdminBusiness';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Drawer } from '@/components/admin/Drawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FormSection, FormField, FormRow, FormActions } from '@/components/admin/FormControls';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { env } from '@/config/env';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { toJalali, formatJalaliShort, formatJalaliInput, parseJalaliInput, jalaliToISODate } from '@/lib/jalali';
import { toPersianDigits } from '@/lib/persian';
import type { BusinessAdminRow, BusinessCategoryWithActive, BusinessImage, BusinessStatus } from '@/types';

const STATUS_LABELS: Record<BusinessStatus, string> = {
  pending: 'در انتظار',
  active: 'فعال',
  inactive: 'غیرفعال',
};

function getLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${logoPath}`;
}

function getCoverUrl(coverPath: string | null): string | null {
  if (!coverPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${coverPath}`;
}

function getGalleryImageUrl(imagePath: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${imagePath}`;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uploadBusinessImage(file: File, folder: 'logos' | 'covers' | 'gallery'): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('businesses')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;
  return fileName;
}

async function deleteBusinessImage(path: string | null): Promise<void> {
  if (!path) return;
  await supabase.storage.from('businesses').remove([path]);
}

// ─── Jalali Date Picker Field ──────────────────────────────────────

interface JalaliDateFieldProps {
  label: string;
  value: string | null;
  onChange: (isoDate: string | null) => void;
  onClear: () => void;
  hint?: string;
}

function JalaliDateField({ label, value, onChange, onClear, hint }: JalaliDateFieldProps) {
  const [inputValue, setInputValue] = useState(() => {
    if (!value) return '';
    try {
      return formatJalaliInput(new Date(value));
    } catch {
      return '';
    }
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setError(null);

    if (!val.trim()) {
      onClear();
      return;
    }

    const parsed = parseJalaliInput(val);
    if (!parsed) {
      setError('فرمت صحیح: ۱۴۰۵/۰۳/۱۵');
      return;
    }

    try {
      const iso = jalaliToISODate(parsed.jy, parsed.jm, parsed.jd);
      onChange(iso);
    } catch {
      setError('تاریخ نامعتبر است');
    }
  };

  return (
    <FormField label={label} hint={hint} error={error ?? undefined}>
      <div className="relative">
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder="۱۴۰۵/۰۳/۱۵"
          className="pr-10"
          dir="ltr"
        />
      </div>
    </FormField>
  );
}

// ─── Gallery Manager (multi-image upload + slideshow preview) ──────

interface GalleryManagerProps {
  businessId: string;
}

function GalleryManager({ businessId }: GalleryManagerProps) {
  const { data: images, isLoading } = useAdminBusinessImages(businessId);
  const addImage = useAddBusinessImage();
  const deleteImage = useDeleteBusinessImage();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const handleUpload = async (files: FileList) => {
    setUploadError(null);
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const maxSize = 5 * 1024 * 1024;
    const tooLarge = fileArr.find((f) => f.size > maxSize);
    if (tooLarge) {
      setUploadError('حداکثر حجم هر فایل ۵ مگابایت است');
      return;
    }

    setUploading(true);
    try {
      for (const file of fileArr) {
        const path = await uploadBusinessImage(file, 'gallery');
        await addImage.mutateAsync({ businessId, imagePath: path });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در آپلود تصاویر';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string, imagePath: string) => {
    try {
      await deleteImage.mutateAsync({ imageId, businessId });
      await deleteBusinessImage(imagePath);
    } catch {
      // hook shows toast
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
      </div>
    );
  }

  const imgs = images ?? [];

  return (
    <div className="space-y-3">
      {/* Slideshow preview */}
      {imgs.length > 0 && (
        <GallerySlideshow
          images={imgs}
          activeIndex={slideIndex}
          onIndexChange={setSlideIndex}
          onDelete={handleDelete}
        />
      )}

      {/* Upload area */}
      <input
        ref={setInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUpload(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef?.click()}
        disabled={uploading || imgs.length >= 5}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-neutral-300 text-sm text-neutral-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? 'در حال آپلود...' : `افزودن تصویر${imgs.length >= 5 ? ' (حداکثر ۵)' : ''}`}
      </button>

      {uploadError && (
        <p className="text-xs text-error-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {uploadError}
        </p>
      )}

      {imgs.length === 0 && !uploading && (
        <p className="text-xs text-neutral-400 text-center">
          هنوز تصویری آپلود نشده است. می‌توانید تا ۵ تصویر اضافه کنید.
        </p>
      )}
    </div>
  );
}

// ─── Gallery Slideshow (admin preview with delete) ─────────────────

function GallerySlideshow({
  images,
  activeIndex,
  onIndexChange,
  onDelete,
}: {
  images: BusinessImage[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  onDelete: (imageId: string, imagePath: string) => void;
}) {
  const clampedIndex = Math.min(activeIndex, images.length - 1);
  const goPrev = () => onIndexChange(Math.max(0, clampedIndex - 1));
  const goNext = () => onIndexChange(Math.min(images.length - 1, clampedIndex + 1));

  return (
    <div>
      {/* Main slide */}
      <div className="relative rounded-xl overflow-hidden bg-neutral-900 aspect-[16/10] group">
        {images.map((img, i) => (
          <div
            key={img.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              i === clampedIndex ? 'opacity-100' : 'opacity-0',
            )}
          >
            <img
              src={getGalleryImageUrl(img.imagePath)}
              alt={`تصویر ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Delete button */}
        <button
          onClick={() => onDelete(images[clampedIndex].id, images[clampedIndex].imagePath)}
          className="absolute top-2 left-2 w-8 h-8 rounded-full bg-neutral-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="حذف تصویر"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={clampedIndex === 0}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-900/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              aria-label="قبلی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              disabled={clampedIndex === images.length - 1}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-900/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              aria-label="بعدی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-neutral-900/60 text-white text-xs font-medium">
            {toPersianDigits(clampedIndex + 1)} / {toPersianDigits(images.length)}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => onIndexChange(i)}
              className={cn(
                'shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-colors',
                i === clampedIndex ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img src={getGalleryImageUrl(img.imagePath)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Image Upload Field (single image: logo/cover) ─────────────────

interface ImageUploadFieldProps {
  label: string;
  path: string | null;
  onPathChange: (path: string | null) => void;
  folder: 'logos' | 'covers' | 'gallery';
  aspect?: 'square' | 'wide';
  hint?: string;
}

function ImageUploadField({ label, path, onPathChange, folder, aspect = 'square', hint }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  const imageUrl = path ? `${env.supabaseUrl}/storage/v1/object/public/businesses/${path}` : null;

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حداکثر حجم فایل ۵ مگابایت است');
      return;
    }
    setUploading(true);
    try {
      const oldPath = path;
      const newPath = await uploadBusinessImage(file, folder);
      onPathChange(newPath);
      if (oldPath) {
        await deleteBusinessImage(oldPath);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در آپلود تصویر';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (path) {
      try {
        await deleteBusinessImage(path);
      } catch {
        // ignore — DB will still be cleared
      }
    }
    onPathChange(null);
  };

  return (
    <FormField label={label} hint={hint} error={uploadError ?? undefined}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'relative group rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 shrink-0',
            aspect === 'square' ? 'w-20 h-20' : 'w-32 h-20',
          )}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-neutral-300" />
            </div>
          )}
          {imageUrl && !uploading && (
            <button
              onClick={handleRemove}
              className="absolute top-1 left-1 w-6 h-6 rounded-full bg-neutral-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="حذف تصویر"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={setInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {imageUrl ? 'تغییر تصویر' : 'آپلود تصویر'}
          </button>
          <p className="text-xs text-neutral-400 mt-1.5">حداکثر ۵ مگابایت — JPG, PNG, WebP</p>
        </div>
      </div>
    </FormField>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export function AdminBusinessPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [editBiz, setEditBiz] = useState<BusinessAdminRow | null>(null);
  const [deleteBiz, setDeleteBiz] = useState<BusinessAdminRow | null>(null);

  const { data: categories, isLoading: catLoading } = useAdminBusinessCategories();

  const queryParams = useMemo(() => ({
    status: statusFilter || null,
    categoryId: categoryFilter || null,
    search: search.trim() || null,
  }), [statusFilter, categoryFilter, search]);

  const { data: businesses, isLoading, error } = useAdminBusinesses(queryParams);

  if (catLoading) return <FullPageSpinner />;

  const totalCount = businesses?.length ?? 0;
  const activeCount = businesses?.filter((b) => b.status === 'active').length ?? 0;
  const featuredCount = businesses?.filter((b) => b.isFeatured).length ?? 0;

  return (
    <div className="max-w-6xl mx-auto">
      <AdminPageHeader
        title="مدیریت کسب‌وکارها"
        description="ایجاد، ویرایش و مدیریت کسب‌وکارهای محلی"
        actions={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            کسب‌وکار جدید
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatMini label="کل" value={totalCount} icon={<Building2 className="w-4 h-4 text-neutral-500" />} />
        <StatMini label="فعال" value={activeCount} icon={<Building2 className="w-4 h-4 text-success-600" />} />
        <StatMini label="ویژه" value={featuredCount} icon={<Star className="w-4 h-4 text-accent-500" />} />
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <Input
              placeholder="جستجوی نام..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="pending">در انتظار</option>
            <option value="inactive">غیرفعال</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <Card className="p-8">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="خطا در بارگذاری"
            description="لطفاً دوباره تلاش کنید"
          />
        </Card>
      ) : !businesses || businesses.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="هنوز کسب‌وکاری ثبت نشده"
            description="برای شروع، اولین کسب‌وکار را ایجاد کنید"
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                کسب‌وکار جدید
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {businesses.map((biz) => (
            <BusinessRow
              key={biz.id}
              biz={biz}
              onEdit={() => setEditBiz(biz)}
              onDelete={() => setDeleteBiz(biz)}
            />
          ))}
        </div>
      )}

      {showCreate && categories && (
        <BusinessFormDrawer
          mode="create"
          categories={categories}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editBiz && categories && (
        <BusinessFormDrawer
          mode="edit"
          biz={editBiz}
          categories={categories}
          onClose={() => setEditBiz(null)}
        />
      )}
      {deleteBiz && (
        <DeleteConfirmDialog
          biz={deleteBiz}
          onClose={() => setDeleteBiz(null)}
        />
      )}
    </div>
  );
}

function StatMini({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-extrabold text-neutral-800 leading-none">{toPersianDigits(value)}</p>
        <p className="text-xs text-neutral-500 mt-1">{label}</p>
      </div>
    </Card>
  );
}

function BusinessRow({
  biz, onEdit, onDelete,
}: {
  biz: BusinessAdminRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const update = useUpdateBusiness();
  const logoUrl = getLogoUrl(biz.logoPath);
  const coverUrl = getCoverUrl(biz.coverPath);

  const toggleActive = () => {
    const newStatus: BusinessStatus = biz.status === 'active' ? 'inactive' : 'active';
    update.mutate({ businessId: biz.id, input: { status: newStatus } });
  };

  const toggleFeatured = () => {
    update.mutate({ businessId: biz.id, input: { isFeatured: !biz.isFeatured } });
  };

  const dateRangeLabel = useMemo(() => {
    if (!biz.startDate && !biz.endDate) return null;
    const start = biz.startDate ? formatJalaliShort(new Date(biz.startDate)) : 'نامشخص';
    const end = biz.endDate ? formatJalaliShort(new Date(biz.endDate)) : 'نامشخص';
    return `${start} تا ${end}`;
  }, [biz.startDate, biz.endDate]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="relative h-20 bg-gradient-to-l from-primary-100 to-accent-50">
        {coverUrl ? (
          <img src={coverUrl} alt={biz.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-l from-primary-50/40 to-accent-50/30" />
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-300 flex items-center justify-center shrink-0 overflow-hidden border-2 border-surface -mt-8 relative shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-5 h-5 text-neutral-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm font-bold text-neutral-800 truncate">{biz.name}</h3>
                <StatusBadge status={biz.status} />
                {biz.isFeatured && (
                  <Badge tone="accent" variant="outline">
                    <Star className="w-3 h-3 fill-current" />
                    ویژه
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {biz.categoryName}
                </span>
                {biz.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {biz.city}
                  </span>
                )}
                {dateRangeLabel && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateRangeLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={toggleFeatured} loading={update.isPending}>
              <Star className={biz.isFeatured ? 'w-3.5 h-3.5 fill-accent-500 text-accent-600' : 'w-3.5 h-3.5'} />
              {biz.isFeatured ? 'بردن ویژه' : 'ویژه کردن'}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleActive} loading={update.isPending}>
              {biz.status === 'active' ? 'غیرفعال' : 'فعال'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit3 className="w-3.5 h-3.5" />
              ویرایش
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-error-600 hover:bg-error-50">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Business Form Drawer (Create + Edit) ─────────────────────────

interface BusinessFormDrawerProps {
  mode: 'create' | 'edit';
  categories: BusinessCategoryWithActive[];
  biz?: BusinessAdminRow;
  onClose: () => void;
}

function BusinessFormDrawer({ mode, categories, biz, onClose }: BusinessFormDrawerProps) {
  const create = useCreateBusiness();
  const update = useUpdateBusiness();

  const activeCategories = categories.filter((c) => c.isActive || (mode === 'edit' && c.id === biz?.categoryId));

  const [name, setName] = useState(biz?.name ?? '');
  const [slug, setSlug] = useState(biz?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [categoryId, setCategoryId] = useState(biz?.categoryId ?? '');
  const [shortDescription, setShortDescription] = useState(biz?.shortDescription ?? '');
  const [description, setDescription] = useState('');
  const [provinceId, setProvinceId] = useState(biz?.provinceId ?? '');
  const [cityId, setCityId] = useState(biz?.cityId ?? '');
  const { data: provinces, isLoading: provincesLoading } = useAdminProvinces();
  const { data: cities, isLoading: citiesLoading } = useAdminCities(provinceId || null);
  const [locality, setLocality] = useState(biz?.locality ?? '');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logoPath, setLogoPath] = useState<string | null>(biz?.logoPath ?? null);
  const [coverPath, setCoverPath] = useState<string | null>(biz?.coverPath ?? null);
  const [status, setStatus] = useState<BusinessStatus>(biz?.status ?? 'pending');
  const [isFeatured, setIsFeatured] = useState(biz?.isFeatured ?? false);
  const [displayOrder, setDisplayOrder] = useState(String(biz?.displayOrder ?? '0'));
  const [startDate, setStartDate] = useState<string | null>(biz?.startDate ?? null);
  const [endDate, setEndDate] = useState<string | null>(biz?.endDate ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvinceId(e.target.value);
    setCityId('');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) { setFormError('نام کسب‌وکار الزامی است'); return; }
    if (!slug.trim()) { setFormError('نامک (slug) الزامی است'); return; }
    if (!categoryId) { setFormError('دسته‌بندی الزامی است'); return; }
    if (!provinceId) { setFormError('استان الزامی است'); return; }
    if (!cityId) { setFormError('شهر الزامی است'); return; }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setFormError('تاریخ شروع باید قبل از تاریخ پایان باشد');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        categoryId,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        city: null,
        locality: locality.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        logoPath,
        coverPath,
        status,
        isFeatured,
        displayOrder: parseInt(displayOrder, 10) || 0,
        startDate,
        endDate,
        provinceId: provinceId || null,
        cityId: cityId || null,
      };

      if (mode === 'create') {
        await create.mutateAsync(payload);
      } else if (biz) {
        await update.mutateAsync({
          businessId: biz.id,
          input: {
            ...payload,
            clearStartDate: !startDate,
            clearEndDate: !endDate,
            clearProvince: !provinceId,
            clearCity: !cityId,
          },
        });
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره کسب‌وکار';
      setFormError(msg);
    }
  };

  const loading = create.isPending || update.isPending;

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === 'create' ? 'ایجاد کسب‌وکار' : 'ویرایش کسب‌وکار'}
      side="right"
      width="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Images: logo + cover */}
        <FormSection title="تصاویر اصلی" description="لوگو و تصویر کاور کسب‌وکار">
          <ImageUploadField
            label="لوگو"
            path={logoPath}
            onPathChange={setLogoPath}
            folder="logos"
            aspect="square"
            hint="تصویر مربعی، حداقل ۲۰۰×۲۰۰ پیکسل"
          />
          <ImageUploadField
            label="تصویر کاور"
            path={coverPath}
            onPathChange={setCoverPath}
            folder="covers"
            aspect="wide"
            hint="تصویر افقی، حداقل ۸۰۰×۳۰۰ پیکسل"
          />
        </FormSection>

        {/* Gallery (edit mode only — needs business ID) */}
        {mode === 'edit' && biz && (
          <FormSection
            title="گالری تصاویر"
            description="تا ۵ تصویر برای نمایش به‌صورت اسلاید در صفحه کسب‌وکار"
          >
            <GalleryManager businessId={biz.id} />
          </FormSection>
        )}

        {/* Basic Info */}
        <FormSection title="اطلاعات پایه">
          <FormRow>
            <FormField label="نام کسب‌وکار" required>
              <Input
                value={name}
                onChange={handleNameChange}
                placeholder="مثلاً: فروشگاه گل‌ها"
              />
            </FormField>
            <FormField label="نامک (slug)" required hint="به انگلیسی، بدون فاصله">
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                dir="ltr"
                placeholder="flowers-shop"
              />
            </FormField>
          </FormRow>

          <FormField label="دسته‌بندی" required>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">انتخاب دسته‌بندی...</option>
              {activeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="توضیح کوتاه" hint="توضیح یک‌خطی برای کارت">
            <Input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="توضیح کوتاه..."
            />
          </FormField>

          <FormField label="توضیح کامل">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="توضیح کامل کسب‌وکار..."
            />
          </FormField>
        </FormSection>

        {/* Date Range */}
        <FormSection
          title="بازه زمانی فعالیت"
          description="تاریخ شروع و پایان فعالیت کسب‌وکار با تقویم شمسی"
        >
          <FormRow>
            <JalaliDateField
              label="از تاریخ (شمسی)"
              value={startDate}
              onChange={setStartDate}
              onClear={() => setStartDate(null)}
              hint="مثلاً: ۱۴۰۵/۰۳/۱۵"
            />
            <JalaliDateField
              label="تا تاریخ (شمسی)"
              value={endDate}
              onChange={setEndDate}
              onClear={() => setEndDate(null)}
              hint="مثلاً: ۱۴۰۵/۰۶/۱۵"
            />
          </FormRow>
          {(startDate || endDate) && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-primary-50/50 rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-primary-500" />
              <span>
                {startDate ? formatJalaliShort(new Date(startDate)) : 'نامشخص'}
                {' تا '}
                {endDate ? formatJalaliShort(new Date(endDate)) : 'نامشخص'}
              </span>
            </div>
          )}
        </FormSection>

        {/* Location */}
        <FormSection title="موقعیت و تماس">
          <FormRow>
            <FormField label="استان" required>
              <select
                value={provinceId}
                onChange={handleProvinceChange}
                disabled={provincesLoading}
                className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="">انتخاب استان...</option>
                {provinces?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="شهر" required>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={!provinceId || citiesLoading}
                className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{provinceId ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'}</option>
                {cities?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
          </FormRow>

          <FormField label="محله">
            <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="سعادت‌آباد" />
          </FormField>

          <FormField label="آدرس">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="آدرس کامل" />
          </FormField>

          <FormRow>
            <FormField label="تلفن">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="02112345678" />
            </FormField>
            <FormField label="وب‌سایت">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" placeholder="example.com" />
            </FormField>
          </FormRow>
        </FormSection>

        {/* Status & Display */}
        <FormSection title="وضعیت و نمایش">
          <FormRow>
            <FormField label="وضعیت">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BusinessStatus)}
                className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="pending">در انتظار</option>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
            </FormField>
            <FormField label="ترتیب نمایش" hint="عدد کوچکتر = اولتر">
              <Input
                type="number"
                inputMode="numeric"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                dir="ltr"
                placeholder="0"
              />
            </FormField>
          </FormRow>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 bg-neutral-100 text-primary-500 focus:ring-primary-500/30"
            />
            <span className="text-sm text-neutral-600">کسب‌وکار ویژه</span>
          </label>
        </FormSection>

        <FormActions>
          <Button type="submit" variant="primary" loading={loading}>
            {mode === 'create' ? 'ایجاد کسب‌وکار' : 'ذخیره تغییرات'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        </FormActions>
      </form>
    </Drawer>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────

function DeleteConfirmDialog({ biz, onClose }: { biz: BusinessAdminRow; onClose: () => void }) {
  const del = useDeleteBusiness();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(biz.id);
      if (biz.logoPath) await deleteBusinessImage(biz.logoPath);
      if (biz.coverPath) await deleteBusinessImage(biz.coverPath);
      onClose();
    } catch {
      // error toast handled by hook
    }
  };

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={handleConfirm}
      title="حذف کسب‌وکار"
      message={`آیا از حذف «${biz.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
      confirmLabel="حذف"
      variant="danger"
      loading={del.isPending}
    />
  );
}
