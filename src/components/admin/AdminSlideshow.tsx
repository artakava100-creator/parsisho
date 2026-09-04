import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Trash2, ImageIcon, Eye, EyeOff, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminSlides, useUpsertSlide, useDeleteSlide } from '@/hooks/useSlideshow';
import { slideshowService, type Slide } from '@/services/slideshow.service';
import { useToast } from '@/providers/useToast';

const ROUTE_OPTIONS = [
  { label: 'مزایده‌ها', value: '/auctions' },
  { label: 'بازار', value: '/market' },
  { label: 'سرزمین هیجان', value: '/excitement' },
  { label: 'کسب‌وکارها', value: '/businesses' },
  { label: 'کیف پول', value: '/wallet' },
  { label: 'صفحه اصلی', value: '/' },
];

function SlideEditor({
  slide,
  index,
  total,
  onMove,
  onDelete,
}: {
  slide: Slide;
  index: number;
  total: number;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
}) {
  const upsert = useUpsertSlide();
  const toast = useToast();
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  const [form, setForm] = useState({
    title: slide.title ?? '',
    subtitle: slide.subtitle ?? '',
    desktop_image_url: slide.desktop_image_url ?? '',
    mobile_image_url: slide.mobile_image_url ?? '',
    cta_text: slide.cta_text ?? '',
    destination_url: slide.destination_url ?? '',
    is_active: slide.is_active,
    sort_order: slide.sort_order,
    start_at: slide.start_at ? slide.start_at.slice(0, 16) : '',
    end_at: slide.end_at ? slide.end_at.slice(0, 16) : '',
  });

  useEffect(() => {
    setForm({
      title: slide.title ?? '',
      subtitle: slide.subtitle ?? '',
      desktop_image_url: slide.desktop_image_url ?? '',
      mobile_image_url: slide.mobile_image_url ?? '',
      cta_text: slide.cta_text ?? '',
      destination_url: slide.destination_url ?? '',
      is_active: slide.is_active,
      sort_order: slide.sort_order,
      start_at: slide.start_at ? slide.start_at.slice(0, 16) : '',
      end_at: slide.end_at ? slide.end_at.slice(0, 16) : '',
    });
  }, [slide]);

  const update = async (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    try {
      await upsert.mutateAsync({
        id: slide.id,
        title: next.title || null,
        subtitle: next.subtitle || null,
        desktop_image_url: next.desktop_image_url || undefined,
        mobile_image_url: next.mobile_image_url || null,
        cta_text: next.cta_text || null,
        destination_url: next.destination_url || null,
        is_active: next.is_active,
        sort_order: next.sort_order,
        start_at: next.start_at ? new Date(next.start_at).toISOString() : null,
        end_at: next.end_at ? new Date(next.end_at).toISOString() : null,
      });
    } catch {
      toast.error('خطا در ذخیره اسلاید');
    }
  };

  const handleUploadDesktop = async (file: File) => {
    setUploadingDesktop(true);
    try {
      const { url, error } = await slideshowService.uploadImage(file, 'desktop');
      if (url) {
        update({ desktop_image_url: url });
        toast.success('تصویر دسکتاپ آپلود شد');
      } else {
        toast.error(error ?? 'خطا در آپلود');
      }
    } finally {
      setUploadingDesktop(false);
    }
  };

  const handleUploadMobile = async (file: File) => {
    setUploadingMobile(true);
    try {
      const { url, error } = await slideshowService.uploadImage(file, 'mobile');
      if (url) {
        update({ mobile_image_url: url });
        toast.success('تصویر موبایل آپلود شد');
      } else {
        toast.error(error ?? 'خطا در آپلود');
      }
    } finally {
      setUploadingMobile(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-bold text-neutral-700">
            اسلاید {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(slide.id, -1)}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="بالا"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(slide.id, 1)}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="پایین"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => update({ is_active: !form.is_active })}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${form.is_active ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
            aria-label="فعال/غیرفعال"
          >
            {form.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(slide.id)}
            className="w-7 h-7 rounded-lg border border-error-200 flex items-center justify-center text-error-500 hover:bg-error-50"
            aria-label="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Desktop image upload */}
        <div>
          <label className="text-sm font-medium text-neutral-600">تصویر دسکتاپ</label>
          <p className="text-xs text-neutral-400 mt-0.5 mb-2">
            ابعاد پیشنهادی: ۱۲۸۰×۵۴۹ پیکسل (نسبت ۲۱:۹)
          </p>
          <div className="flex items-start gap-3">
            <div className="w-32 h-16 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0">
              {form.desktop_image_url ? (
                <img src={form.desktop_image_url} alt="دسکتاپ" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <input
                ref={desktopInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadDesktop(f);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" onClick={() => desktopInputRef.current?.click()} disabled={uploadingDesktop}>
                {uploadingDesktop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingDesktop ? 'آپلود...' : 'آپلود'}
              </Button>
              {form.desktop_image_url && (
                <Button variant="ghost" size="sm" onClick={() => update({ desktop_image_url: '' })}>
                  <X className="w-3.5 h-3.5" /> حذف
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile image upload */}
        <div>
          <label className="text-sm font-medium text-neutral-600">تصویر موبایل (اختیاری)</label>
          <p className="text-xs text-neutral-400 mt-0.5 mb-2">
            ابعاد پیشنهادی: ۷۶۸×۲۵۶ پیکسل (نسبت ۳:۱) — در صورت خالی بودن، تصویر دسکتاپ استفاده می‌شود
          </p>
          <div className="flex items-start gap-3">
            <div className="w-20 h-16 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0">
              {form.mobile_image_url ? (
                <img src={form.mobile_image_url} alt="موبایل" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <input
                ref={mobileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadMobile(f);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" onClick={() => mobileInputRef.current?.click()} disabled={uploadingMobile}>
                {uploadingMobile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingMobile ? 'آپلود...' : 'آپلود'}
              </Button>
              {form.mobile_image_url && (
                <Button variant="ghost" size="sm" onClick={() => update({ mobile_image_url: '' })}>
                  <X className="w-3.5 h-3.5" /> حذف
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-600">عنوان (اختیاری)</label>
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            onBlur={() => update({ title: form.title })}
            placeholder="عنوان اسلاید"
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-600">زیرعنوان (اختیاری)</label>
          <Input
            value={form.subtitle}
            onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
            onBlur={() => update({ subtitle: form.subtitle })}
            placeholder="توضیحات اسلاید"
          />
        </div>

        {/* CTA text + destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-600">متن دکمه (اختیاری)</label>
            <Input
              value={form.cta_text}
              onChange={(e) => setForm((p) => ({ ...p, cta_text: e.target.value }))}
              onBlur={() => update({ cta_text: form.cta_text })}
              placeholder="مشاهده"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-600">مقصد لینک</label>
            <select
              value={form.destination_url}
              onChange={(e) => update({ destination_url: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
            >
              <option value="">— بدون لینک —</option>
              {ROUTE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scheduling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-600">تاریخ شروع (اختیاری)</label>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))}
              onBlur={() => update({ start_at: form.start_at })}
              className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-600">تاریخ پایان (اختیاری)</label>
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))}
              onBlur={() => update({ end_at: form.end_at })}
              className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSlideshow() {
  const { data: slides, isLoading } = useAdminSlides();
  const upsert = useUpsertSlide();
  const del = useDeleteSlide();
  const toast = useToast();

  const handleMove = async (id: string, dir: -1 | 1) => {
    const all = slides ?? [];
    const idx = all.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= all.length) return;

    const currentSlide = all[idx];
    const targetSlide = all[target];

    try {
      await Promise.all([
        upsert.mutateAsync({ id: currentSlide.id, sort_order: targetSlide.sort_order }),
        upsert.mutateAsync({ id: targetSlide.id, sort_order: currentSlide.sort_order }),
      ]);
      toast.success('ترتیب اسلایدها به‌روزرسانی شد');
    } catch {
      toast.error('خطا در تغییر ترتیب');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success('اسلاید حذف شد');
    } catch {
      toast.error('خطا در حذف اسلاید');
    }
  };

  const handleAdd = async () => {
    try {
      const maxSort = Math.max(0, ...(slides ?? []).map((s) => s.sort_order));
      await upsert.mutateAsync({
        title: 'اسلاید جدید',
        desktop_image_url: '',
        is_active: false,
        sort_order: maxSort + 1,
      });
      toast.success('اسلاید جدید اضافه شد');
    } catch {
      toast.error('خطا در افزودن اسلاید');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      </Card>
    );
  }

  const allSlides = slides ?? [];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
        <h3 className="text-base font-bold text-neutral-800">اسلایدشو صفحه اصلی</h3>
        <Button variant="secondary" size="sm" onClick={handleAdd} disabled={upsert.isPending}>
          <Plus className="w-4 h-4" />
          افزودن اسلاید
        </Button>
      </div>
      <div className="space-y-3">
        {allSlides.map((slide, idx) => (
          <SlideEditor
            key={slide.id}
            slide={slide}
            index={idx}
            total={allSlides.length}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        ))}
        {allSlides.length === 0 && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            هنوز اسلایدی ایجاد نشده است. روی «افزودن اسلاید» کلیک کنید.
          </div>
        )}
      </div>
    </Card>
  );
}
