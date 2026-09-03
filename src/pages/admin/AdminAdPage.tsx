import { useState, useMemo } from 'react';
import { Megaphone, Plus, Pencil, Trash2, Copy, Eye, ExternalLink, Calendar, Power, BarChart3 } from 'lucide-react';
import { useAdminListAdvertisements, useAdminCreateAdvertisement, useAdminUpdateAdvertisement, useAdminDeleteAdvertisement, useAdSlots, useAdminAdAnalytics } from '@/hooks/useAds';
import { useToast } from '@/providers/useToast';
import { normalizeError } from '@/services/api-error';
import { toPersianDigits } from '@/lib/persian';
import { formatJalaliShort } from '@/lib/jalali';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { Advertisement, AdSlot } from '@/types';

interface AdFormData {
  id?: string;
  title: string;
  imageUrl: string;
  destinationUrl: string;
  isActive: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
  slotIds: string[];
}

const EMPTY_FORM: AdFormData = {
  title: '',
  imageUrl: '',
  destinationUrl: '',
  isActive: false,
  priority: 0,
  startsAt: '',
  endsAt: '',
  slotIds: [],
};

function getAdStatus(ad: Advertisement): 'active' | 'scheduled' | 'expired' | 'inactive' {
  if (!ad.isActive) return 'inactive';
  const now = new Date();
  if (ad.startsAt && new Date(ad.startsAt) > now) return 'scheduled';
  if (ad.endsAt && new Date(ad.endsAt) < now) return 'expired';
  return 'active';
}

const STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  scheduled: 'زمان‌بندی شده',
  expired: 'منقضی',
  inactive: 'غیرفعال',
};

const STATUS_TONES: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  scheduled: 'warning',
  expired: 'error',
  inactive: 'neutral',
};

function AdEditor({
  open,
  onClose,
  form,
  setForm,
  slots,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  form: AdFormData;
  setForm: (f: AdFormData) => void;
  slots: AdSlot[] | undefined;
  onSave: () => void;
  isSaving: boolean;
}) {
  const slotsByPage = useMemo(() => {
    const groups: Record<string, AdSlot[]> = {};
    (slots ?? []).forEach((s) => {
      if (!groups[s.page]) groups[s.page] = [];
      groups[s.page].push(s);
    });
    return groups;
  }, [slots]);

  const pageLabels: Record<string, string> = {
    wallet: 'کیف پول',
    shop: 'بازار',
    auction: 'مزایده',
    local: 'محله کسب‌وکار',
  };

  const toggleSlot = (slotId: string) => {
    const current = form.slotIds;
    if (current.includes(slotId)) {
      setForm({ ...form, slotIds: current.filter((id) => id !== slotId) });
    } else {
      setForm({ ...form, slotIds: [...current, slotId] });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={form.id ? 'ویرایش تبلیغ' : 'تبلیغ جدید'} size="lg">
      <div className="space-y-5">
        {/* General */}
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase mb-2">اطلاعات کلی</p>
          <Input
            label="عنوان"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="عنوان تبلیغ"
          />
        </div>

        {/* Creative */}
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase mb-2">تصویر تبلیغ</p>
          <Input
            label="آدرس تصویر"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="https://..."
            dir="ltr"
          />
          {form.imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-neutral-200 max-w-[200px]">
              <img src={form.imageUrl} alt="پیش‌نمایش" className="w-full h-auto" />
            </div>
          )}
        </div>

        {/* Destination */}
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase mb-2">مقصد</p>
          <Input
            label="آدرس مقصد"
            value={form.destinationUrl}
            onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
            placeholder="https://..."
            dir="ltr"
          />
        </div>

        {/* Placements */}
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase mb-2">موقعیت‌ها</p>
          <div className="space-y-3">
            {Object.entries(slotsByPage).map(([page, pageSlots]) => (
              <div key={page}>
                <p className="text-sm font-medium text-neutral-600 mb-1.5">{pageLabels[page] ?? page}</p>
                <div className="flex flex-wrap gap-2">
                  {pageSlots.map((slot) => {
                    const selected = form.slotIds.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => toggleSlot(slot.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-primary-50 border-primary-400 text-primary-700'
                            : 'bg-surface-overlay border-neutral-300 text-neutral-500 hover:border-primary-300'
                        }`}
                      >
                        {slot.placement}
                        {slot.devices.length === 1 && slot.devices[0] === 'desktop' && ' (دسکتاپ)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase mb-2">زمان‌بندی</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="شروع (اختیاری)"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
            <Input
              label="پایان (اختیاری)"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </div>
        </div>

        {/* Display & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase mb-2">اولویت</p>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase mb-2">وضعیت</p>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`w-full h-11 px-4 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                form.isActive
                  ? 'bg-success-50 border-success-300 text-success-700'
                  : 'bg-surface-overlay border-neutral-300 text-neutral-500'
              }`}
            >
              <Power className="w-4 h-4" />
              {form.isActive ? 'فعال' : 'غیرفعال'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="primary" fullWidth onClick={onSave} loading={isSaving}>
            ذخیره
          </Button>
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminAdPage() {
  const { data: ads, isLoading } = useAdminListAdvertisements();
  const { data: slots } = useAdSlots();
  const { data: analytics } = useAdminAdAnalytics();
  const createAd = useAdminCreateAdvertisement();
  const updateAd = useAdminUpdateAdvertisement();
  const deleteAd = useAdminDeleteAdvertisement();
  const toast = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<AdFormData>(EMPTY_FORM);

  const analyticsMap = useMemo(() => {
    const map: Record<string, { impressions: number; clicks: number }> = {};
    (analytics ?? []).forEach((a) => {
      if (a.advertisementId) {
        map[a.advertisementId] = { impressions: a.impressions, clicks: a.clicks };
      }
    });
    return map;
  }, [analytics]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setForm({
      id: ad.id,
      title: ad.title,
      imageUrl: ad.imageUrl,
      destinationUrl: ad.destinationUrl,
      isActive: ad.isActive,
      priority: ad.priority,
      startsAt: ad.startsAt ? ad.startsAt.slice(0, 16) : '',
      endsAt: ad.endsAt ? ad.endsAt.slice(0, 16) : '',
      slotIds: ad.slotIds ?? [],
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.imageUrl || !form.destinationUrl) {
      toast.error('خطا', 'عنوان، تصویر و مقصد الزامی هستند');
      return;
    }

    try {
      const startsAt = form.startsAt ? new Date(form.startsAt).toISOString() : null;
      const endsAt = form.endsAt ? new Date(form.endsAt).toISOString() : null;

      if (form.id) {
        await updateAd.mutateAsync({
          advertisementId: form.id,
          title: form.title,
          imageUrl: form.imageUrl,
          destinationUrl: form.destinationUrl,
          isActive: form.isActive,
          priority: form.priority,
          startsAt,
          endsAt,
          setStartsNull: !form.startsAt,
          setEndsNull: !form.endsAt,
        });
        toast.success('تبلیغ ویرایش شد');
      } else {
        const adId = await createAd.mutateAsync({
          title: form.title,
          imageUrl: form.imageUrl,
          destinationUrl: form.destinationUrl,
          isActive: form.isActive,
          priority: form.priority,
          startsAt,
          endsAt,
          slotIds: form.slotIds.length > 0 ? form.slotIds : null,
        });
        if (form.slotIds.length > 0) {
          // Slots already set during create
        }
        toast.success('تبلیغ ایجاد شد');
      }

      setEditorOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا', normalized.message);
    }
  };

  const handleDelete = async (ad: Advertisement) => {
    if (!confirm(`حذف تبلیغ «${ad.title}»؟`)) return;
    try {
      await deleteAd.mutateAsync(ad.id);
      toast.success('تبلیغ حذف شد');
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا', normalized.message);
    }
  };

  const handleDuplicate = (ad: Advertisement) => {
    setForm({
      title: ad.title + ' (کپی)',
      imageUrl: ad.imageUrl,
      destinationUrl: ad.destinationUrl,
      isActive: false,
      priority: ad.priority,
      startsAt: ad.startsAt ? ad.startsAt.slice(0, 16) : '',
      endsAt: ad.endsAt ? ad.endsAt.slice(0, 16) : '',
      slotIds: ad.slotIds ?? [],
    });
    setEditorOpen(true);
  };

  const handleToggleActive = async (ad: Advertisement) => {
    try {
      await updateAd.mutateAsync({
        advertisementId: ad.id,
        isActive: !ad.isActive,
      });
      toast.success(ad.isActive ? 'تبلیغ غیرفعال شد' : 'تبلیغ فعال شد');
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا', normalized.message);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">مدیریت تبلیغات</h1>
            <p className="text-sm text-neutral-500">ایجاد و مدیریت تبلیغات پارسیشو</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          تبلیغ جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !ads || ads.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-8 h-8" />}
          title="تبلیغی وجود ندارد"
          description="برای ایجاد تبلیغ جدید روی دکمه بالا کلیک کنید."
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              تبلیغ جدید
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => {
            const status = getAdStatus(ad);
            const stats = analyticsMap[ad.id];
            return (
              <div key={ad.id} className="rounded-xl bg-surface-raised border border-neutral-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 shrink-0">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-neutral-800 truncate">{ad.title}</h3>
                      <Badge tone={STATUS_TONES[status]} variant="soft" className="text-[10px]">
                        {STATUS_LABELS[status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[200px]" dir="ltr">{ad.destinationUrl}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatJalaliShort(new Date(ad.createdAt))}
                      </span>
                      {stats && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {toPersianDigits(stats.impressions)} / {toPersianDigits(stats.clicks)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(ad)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-surface-overlay transition-colors"
                      title={ad.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(ad)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-surface-overlay transition-colors"
                      title="ویرایش"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(ad)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-surface-overlay transition-colors"
                      title="کپی"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ad)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        form={form}
        setForm={setForm}
        slots={slots}
        onSave={handleSave}
        isSaving={createAd.isPending || updateAd.isPending}
      />
    </div>
  );
}
