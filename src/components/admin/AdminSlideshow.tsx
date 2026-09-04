import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, Upload, Trash2, ImageIcon, Eye, EyeOff,
  ArrowUp, ArrowDown, Plus, X, Pencil, Check, AlertCircle,
} from 'lucide-react';
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

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface SlideForm {
  title: string;
  subtitle: string;
  desktop_image_url: string;
  mobile_image_url: string;
  cta_text: string;
  destination_url: string;
  is_active: boolean;
  sort_order: number;
  start_at: string;
  end_at: string;
}

function emptyForm(sortOrder: number): SlideForm {
  return {
    title: '',
    subtitle: '',
    desktop_image_url: '',
    mobile_image_url: '',
    cta_text: '',
    destination_url: '',
    is_active: true,
    sort_order: sortOrder,
    start_at: '',
    end_at: '',
  };
}

function slideToForm(s: Slide): SlideForm {
  return {
    title: s.title ?? '',
    subtitle: s.subtitle ?? '',
    desktop_image_url: s.desktop_image_url ?? '',
    mobile_image_url: s.mobile_image_url ?? '',
    cta_text: s.cta_text ?? '',
    destination_url: s.destination_url ?? '',
    is_active: s.is_active,
    sort_order: s.sort_order,
    start_at: s.start_at ? s.start_at.slice(0, 16) : '',
    end_at: s.end_at ? s.end_at.slice(0, 16) : '',
  };
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'فقط فرمت‌های JPEG، PNG، WebP و AVIF مجاز هستند';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'حجم فایل نباید بیشتر از ۵ مگابایت باشد';
  }
  return null;
}

/* ─── Image Upload Field ─── */
function ImageUploadField({
  label,
  hint,
  imageUrl,
  onUploaded,
  onRemoved,
  uploadType,
  previewClass,
}: {
  label: string;
  hint: string;
  imageUrl: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  uploadType: 'desktop' | 'mobile';
  previewClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const toast = useToast();

  const handleFile = async (file: File) => {
    setUploadError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    try {
      const { url, error } = await slideshowService.uploadImage(file, uploadType);
      if (url) {
        onUploaded(url);
        toast.success(`تصویر ${uploadType === 'desktop' ? 'دسکتاپ' : 'موبایل'} آپلود شد`);
      } else {
        setUploadError(error ?? 'تصویر آپلود نشد');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-neutral-600">{label}</label>
      <p className="text-xs text-neutral-400 mt-0.5 mb-2">{hint}</p>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0 ${previewClass}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'آپلود...' : imageUrl ? 'تغییر' : 'آپلود'}
          </Button>
          {imageUrl && (
            <Button variant="ghost" size="sm" onClick={onRemoved} disabled={uploading}>
              <X className="w-3.5 h-3.5" /> حذف
            </Button>
          )}
          {uploadError && (
            <p className="text-xs text-error-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {uploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Slide Form (used for both Create and Edit) ─── */
function SlideFormPanel({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  saveLabel,
  errors,
}: {
  form: SlideForm;
  onChange: (patch: Partial<SlideForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
  errors: Record<string, string>;
}) {
  return (
    <div className="p-4 space-y-3">
      {/* Desktop image */}
      <ImageUploadField
        label="تصویر دسکتاپ"
        hint="ابعاد پیشنهادی: ۱۲۸۰×۳۶۶ پیکسل (نسبت ۷:۲)"
        imageUrl={form.desktop_image_url}
        onUploaded={(url) => onChange({ desktop_image_url: url })}
        onRemoved={() => onChange({ desktop_image_url: '' })}
        uploadType="desktop"
        previewClass="w-32 h-16"
      />

      {/* Mobile image */}
      <ImageUploadField
        label="تصویر موبایل (اختیاری)"
        hint="ابعاد پیشنهادی: ۷۶۸×۱۷۱ پیکسل (نسبت ۹:۲) — در صورت خالی بودن، تصویر دسکتاپ استفاده می‌شود"
        imageUrl={form.mobile_image_url}
        onUploaded={(url) => onChange({ mobile_image_url: url })}
        onRemoved={() => onChange({ mobile_image_url: '' })}
        uploadType="mobile"
        previewClass="w-20 h-16"
      />

      {/* Title */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-600">عنوان</label>
        <Input
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="عنوان اسلاید"
        />
        {errors.title && <p className="text-xs text-error-600">{errors.title}</p>}
      </div>

      {/* Subtitle */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-600">توضیحات (اختیاری)</label>
        <Input
          value={form.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="توضیحات اسلاید"
        />
      </div>

      {/* CTA + destination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-600">متن دکمه (اختیاری)</label>
          <Input
            value={form.cta_text}
            onChange={(e) => onChange({ cta_text: e.target.value })}
            placeholder="مشاهده"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-600">مقصد لینک</label>
          <select
            value={ROUTE_OPTIONS.some((r) => r.value === form.destination_url) ? form.destination_url : '__custom__'}
            onChange={(e) => {
              if (e.target.value === '__custom__') return;
              onChange({ destination_url: e.target.value });
            }}
            className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
          >
            <option value="">— بدون لینک —</option>
            {ROUTE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
            {form.destination_url && !ROUTE_OPTIONS.some((r) => r.value === form.destination_url) && (
              <option value="__custom__">لینک سفارشی: {form.destination_url}</option>
            )}
          </select>
          {form.destination_url && !ROUTE_OPTIONS.some((r) => r.value === form.destination_url) && (
            <Input
              value={form.destination_url}
              onChange={(e) => onChange({ destination_url: e.target.value })}
              placeholder="/path"
              dir="ltr"
              className="mt-1"
            />
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-neutral-600">وضعیت</label>
        <button
          type="button"
          onClick={() => onChange({ is_active: !form.is_active })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            form.is_active
              ? 'bg-success-50 border-success-300 text-success-700'
              : 'bg-neutral-50 border-neutral-200 text-neutral-500'
          }`}
        >
          {form.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {form.is_active ? 'فعال' : 'غیرفعال'}
        </button>
      </div>

      {/* Scheduling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-600">تاریخ شروع (اختیاری)</label>
          <input
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => onChange({ start_at: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-600">تاریخ پایان (اختیاری)</label>
          <input
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => onChange({ end_at: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saveLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          انصراف
        </Button>
      </div>
    </div>
  );
}

/* ─── Slide Row (collapsed view in list) ─── */
function SlideRow({
  slide,
  index,
  total,
  onEdit,
  onMove,
  onToggleActive,
  onDelete,
}: {
  slide: Slide;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Thumbnail */}
        <div className="w-20 h-12 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0">
          {slide.desktop_image_url ? (
            <img src={slide.desktop_image_url} alt={slide.title ?? ''} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </span>
            <h4 className="text-sm font-bold text-neutral-800 truncate">
              {slide.title || 'بدون عنوان'}
            </h4>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
              slide.is_active
                ? 'bg-success-50 text-success-700'
                : 'bg-neutral-100 text-neutral-400'
            }`}>
              {slide.is_active ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
            {slide.cta_text && <span>{slide.cta_text}</span>}
            {slide.destination_url && (
              <>
                <span className="text-neutral-200">|</span>
                <span dir="ltr">{slide.destination_url}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="بالا"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="پایین"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleActive}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
              slide.is_active
                ? 'bg-success-50 border-success-300 text-success-600'
                : 'bg-neutral-50 border-neutral-200 text-neutral-400'
            }`}
            aria-label="فعال/غیرفعال"
          >
            {slide.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg border border-primary-200 flex items-center justify-center text-primary-600 hover:bg-primary-50"
            aria-label="ویرایش"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-7 h-7 rounded-lg border border-error-200 flex items-center justify-center text-error-500 hover:bg-error-50"
              aria-label="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                className="h-7 px-2 rounded-lg bg-error-600 text-white text-xs font-bold hover:bg-error-700"
              >
                تایید حذف
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="h-7 px-2 rounded-lg border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                لغو
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main AdminSlideshow ─── */
export function AdminSlideshow() {
  const { data: slides, isLoading, error: fetchError } = useAdminSlides();
  const upsertMutation = useUpsertSlide();
  const deleteMutation = useDeleteSlide();
  const toast = useToast();

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>(emptyForm(0));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const allSlides = slides ?? [];

  const patchForm = useCallback((patch: Partial<SlideForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  }, []);

  const resetToList = useCallback(() => {
    setMode('list');
    setEditingId(null);
    setForm(emptyForm(0));
    setFormErrors({});
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'عنوان اسلاید الزامی است';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const formToPayload = (id?: string): Partial<Slide> & { id?: string } => ({
    ...(id ? { id } : {}),
    title: form.title.trim() || null,
    subtitle: form.subtitle.trim() || null,
    desktop_image_url: form.desktop_image_url || undefined,
    mobile_image_url: form.mobile_image_url || null,
    cta_text: form.cta_text.trim() || null,
    destination_url: form.destination_url || null,
    is_active: form.is_active,
    sort_order: form.sort_order,
    start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
    end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
  });

  /* ─ Create ─ */
  const handleCreate = async () => {
    if (!validate()) return;
    try {
      await upsertMutation.mutateAsync(formToPayload());
      toast.success('اسلاید جدید ایجاد شد');
      resetToList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unauthorized')) {
        toast.error('دسترسی لازم برای ایجاد اسلاید وجود ندارد');
      } else {
        toast.error('ذخیره اسلاید انجام نشد. دوباره تلاش کنید.');
      }
    }
  };

  /* ─ Edit ─ */
  const startEdit = (slide: Slide) => {
    setEditingId(slide.id);
    setForm(slideToForm(slide));
    setFormErrors({});
    setMode('edit');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !validate()) return;
    try {
      await upsertMutation.mutateAsync(formToPayload(editingId));
      toast.success('اسلاید به‌روزرسانی شد');
      resetToList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unauthorized')) {
        toast.error('دسترسی لازم برای ویرایش اسلاید وجود ندارد');
      } else {
        toast.error('ذخیره تغییرات انجام نشد. دوباره تلاش کنید.');
      }
    }
  };

  /* ─ Delete ─ */
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('اسلاید حذف شد');
      if (editingId === id) resetToList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unauthorized')) {
        toast.error('دسترسی لازم برای حذف اسلاید وجود ندارد');
      } else {
        toast.error('حذف اسلاید انجام نشد. دوباره تلاش کنید.');
      }
    }
  };

  /* ─ Toggle Active ─ */
  const handleToggleActive = async (slide: Slide) => {
    try {
      await upsertMutation.mutateAsync({
        id: slide.id,
        is_active: !slide.is_active,
      });
      toast.success(slide.is_active ? 'اسلاید غیرفعال شد' : 'اسلاید فعال شد');
    } catch {
      toast.error('تغییر وضعیت انجام نشد');
    }
  };

  /* ─ Move (reorder) ─ */
  const handleMove = async (id: string, dir: -1 | 1) => {
    const idx = allSlides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= allSlides.length) return;
    const a = allSlides[idx];
    const b = allSlides[target];
    try {
      await Promise.all([
        upsertMutation.mutateAsync({ id: a.id, sort_order: b.sort_order }),
        upsertMutation.mutateAsync({ id: b.id, sort_order: a.sort_order }),
      ]);
    } catch {
      toast.error('تغییر ترتیب انجام نشد');
    }
  };

  /* ─ Start Create ─ */
  const openCreateForm = () => {
    const maxSort = allSlides.length > 0 ? Math.max(...allSlides.map((s) => s.sort_order)) : -1;
    setForm(emptyForm(maxSort + 1));
    setFormErrors({});
    setMode('create');
    setEditingId(null);
  };

  /* ─ Loading ─ */
  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      </Card>
    );
  }

  /* ─ Fetch Error ─ */
  if (fetchError) {
    return (
      <Card className="p-5">
        <div className="flex flex-col items-center justify-center py-8 text-error-600 gap-2">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm">بارگذاری اسلایدها انجام نشد. صفحه را دوباره بارگذاری کنید.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
        <h3 className="text-base font-bold text-neutral-800">اسلایدشو صفحه اصلی</h3>
        {mode === 'list' && (
          <Button variant="secondary" size="sm" onClick={openCreateForm}>
            <Plus className="w-4 h-4" />
            افزودن اسلاید
          </Button>
        )}
      </div>

      {/* ─── Create Form ─── */}
      {mode === 'create' && (
        <div className="rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/30 mb-4">
          <div className="px-4 py-2.5 border-b border-primary-200">
            <span className="text-sm font-bold text-primary-700">اسلاید جدید</span>
          </div>
          <SlideFormPanel
            form={form}
            onChange={patchForm}
            onSave={handleCreate}
            onCancel={resetToList}
            saving={upsertMutation.isPending}
            saveLabel="ایجاد اسلاید"
            errors={formErrors}
          />
        </div>
      )}

      {/* ─── Edit Form ─── */}
      {mode === 'edit' && editingId && (
        <div className="rounded-xl border-2 border-primary-300 bg-primary-50/20 mb-4">
          <div className="px-4 py-2.5 border-b border-primary-200">
            <span className="text-sm font-bold text-primary-700">ویرایش اسلاید</span>
          </div>
          <SlideFormPanel
            form={form}
            onChange={patchForm}
            onSave={handleSaveEdit}
            onCancel={resetToList}
            saving={upsertMutation.isPending}
            saveLabel="ذخیره تغییرات"
            errors={formErrors}
          />
        </div>
      )}

      {/* ─── Slide List ─── */}
      <div className="space-y-2">
        {allSlides.map((slide, idx) => (
          <SlideRow
            key={slide.id}
            slide={slide}
            index={idx}
            total={allSlides.length}
            onEdit={() => startEdit(slide)}
            onMove={(dir) => handleMove(slide.id, dir)}
            onToggleActive={() => handleToggleActive(slide)}
            onDelete={() => handleDelete(slide.id)}
          />
        ))}
        {allSlides.length === 0 && mode === 'list' && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            هنوز اسلایدی وجود ندارد. روی «افزودن اسلاید» کلیک کنید.
          </div>
        )}
      </div>
    </Card>
  );
}
