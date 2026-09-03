import { useState, useMemo } from 'react';
import {
  Building2, Plus, Edit3, Star, AlertCircle, Search, Filter,
} from 'lucide-react';
import {
  useAdminBusinesses, useAdminBusinessCategories, useCreateBusiness, useUpdateBusiness,
} from '@/hooks/useAdminBusiness';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { env } from '@/config/env';
import type { BusinessAdminRow, BusinessCategoryWithActive, BusinessStatus } from '@/types';

const STATUS_LABELS: Record<BusinessStatus, string> = {
  pending: 'در انتظار',
  active: 'فعال',
  inactive: 'غیرفعال',
};

function statusTone(status: BusinessStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function getLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${logoPath}`;
}

export function AdminBusinessPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [editBiz, setEditBiz] = useState<BusinessAdminRow | null>(null);

  const { data: categories, isLoading: catLoading } = useAdminBusinessCategories();

  const queryParams = useMemo(() => ({
    status: statusFilter || null,
    categoryId: categoryFilter || null,
    search: search.trim() || null,
  }), [statusFilter, categoryFilter, search]);

  const { data: businesses, isLoading, error } = useAdminBusinesses(queryParams);

  if (catLoading) return <FullPageSpinner />;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">مدیریت کسب‌وکارها</h1>
            <p className="text-sm text-neutral-500">ایجاد، ویرایش و مدیریت کسب‌وکارهای محلی</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          کسب‌وکار جدید
        </Button>
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
            <BusinessRow key={biz.id} biz={biz} onEdit={() => setEditBiz(biz)} />
          ))}
        </div>
      )}

      {showCreate && categories && (
        <CreateBusinessModal categories={categories} onClose={() => setShowCreate(false)} />
      )}
      {editBiz && categories && (
        <EditBusinessModal biz={editBiz} categories={categories} onClose={() => setEditBiz(null)} />
      )}
    </div>
  );
}

function BusinessRow({ biz, onEdit }: { biz: BusinessAdminRow; onEdit: () => void }) {
  const update = useUpdateBusiness();
  const logoUrl = getLogoUrl(biz.logoPath);

  const toggleActive = () => {
    const newStatus: BusinessStatus = biz.status === 'active' ? 'inactive' : 'active';
    update.mutate({ businessId: biz.id, input: { status: newStatus } });
  };

  const toggleFeatured = () => {
    update.mutate({ businessId: biz.id, input: { isFeatured: !biz.isFeatured } });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-300 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-5 h-5 text-neutral-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-neutral-800 truncate">{biz.name}</h3>
              <Badge tone={statusTone(biz.status)} variant="soft">
                {STATUS_LABELS[biz.status]}
              </Badge>
              {biz.isFeatured && (
                <Badge tone="accent" variant="outline">
                  <Star className="w-3 h-3 fill-current" />
                  ویژه
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
              <span>{biz.categoryName}</span>
              {biz.city && <span>، {biz.city}</span>}
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
        </div>
      </div>
    </Card>
  );
}

function CreateBusinessModal({ categories, onClose }: { categories: BusinessCategoryWithActive[]; onClose: () => void }) {
  const create = useCreateBusiness();
  const activeCategories = categories.filter((c) => c.isActive);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<BusinessStatus>('pending');
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) { setFormError('نام کسب‌وکار الزامی است'); return; }
    if (!slug.trim()) { setFormError('نامک (slug) الزامی است'); return; }
    if (!categoryId) { setFormError('دسته‌بندی الزامی است'); return; }

    try {
      await create.mutateAsync({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        categoryId,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        city: city.trim() || null,
        locality: locality.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        status,
        isFeatured,
        displayOrder: parseInt(displayOrder, 10) || 0,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد کسب‌وکار';
      setFormError(msg);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="ایجاد کسب‌وکار" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="نام کسب‌وکار *" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: فروشگاه گل‌ها" />
          <Input label="نامک (slug) *" value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" placeholder="flowers-shop" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-2">دسته‌بندی *</label>
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
        </div>

        <Input label="توضیح کوتاه" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="توضیح یک‌خطی برای کارت" />

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-2">توضیح کامل</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            placeholder="توضیح کامل کسب‌وکار..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="شهر" value={city} onChange={(e) => setCity(e.target.value)} placeholder="تهران" />
          <Input label="محله" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="سعادت‌آباد" />
        </div>

        <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="آدرس کامل" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="تلفن" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="02112345678" />
          <Input label="وب‌سایت" value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" placeholder="example.com" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-2">وضعیت</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BusinessStatus)}
              className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="pending">در انتظار</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </div>
          <Input label="ترتیب نمایش" type="number" inputMode="numeric" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} dir="ltr" placeholder="0" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 bg-neutral-100 text-primary-500 focus:ring-primary-500/30"
          />
          <span className="text-sm text-neutral-600">کسب‌وکار ویژه</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" fullWidth loading={create.isPending}>
            ایجاد کسب‌وکار
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditBusinessModal({ biz, categories, onClose }: { biz: BusinessAdminRow; categories: BusinessCategoryWithActive[]; onClose: () => void }) {
  const update = useUpdateBusiness();

  const [name, setName] = useState(biz.name);
  const [slug, setSlug] = useState(biz.slug);
  const [categoryId, setCategoryId] = useState(biz.categoryId);
  const [shortDescription, setShortDescription] = useState(biz.shortDescription ?? '');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(biz.city ?? '');
  const [locality, setLocality] = useState(biz.locality ?? '');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<BusinessStatus>(biz.status);
  const [isFeatured, setIsFeatured] = useState(biz.isFeatured);
  const [displayOrder, setDisplayOrder] = useState(String(biz.displayOrder));
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) { setFormError('نام کسب‌وکار الزامی است'); return; }
    if (!slug.trim()) { setFormError('نامک الزامی است'); return; }
    if (!categoryId) { setFormError('دسته‌بندی الزامی است'); return; }

    try {
      await update.mutateAsync({
        businessId: biz.id,
        input: {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          categoryId,
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          city: city.trim() || null,
          locality: locality.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          status,
          isFeatured,
          displayOrder: parseInt(displayOrder, 10) || 0,
        },
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش کسب‌وکار';
      setFormError(msg);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="ویرایش کسب‌وکار" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="نام کسب‌وکار *" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="نامک (slug) *" value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-2">دسته‌بندی *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <Input label="توضیح کوتاه" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-2">توضیح کامل</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="شهر" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="محله" value={locality} onChange={(e) => setLocality(e.target.value)} />
        </div>

        <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="تلفن" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          <Input label="وب‌سایت" value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-2">وضعیت</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BusinessStatus)}
              className="w-full h-11 px-3 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="pending">در انتظار</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </div>
          <Input label="ترتیب نمایش" type="number" inputMode="numeric" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} dir="ltr" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 bg-neutral-100 text-primary-500 focus:ring-primary-500/30"
          />
          <span className="text-sm text-neutral-600">کسب‌وکار ویژه</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" fullWidth loading={update.isPending}>
            ذخیره تغییرات
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </form>
    </Modal>
  );
}
