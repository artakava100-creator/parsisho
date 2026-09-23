import { useState, useRef, useCallback } from 'react';
import {
  Loader2, Upload, Trash2, ImageIcon, Eye, EyeOff,
  ArrowUp, ArrowDown, Plus, X, Pencil, Check, AlertCircle,
  Copy, Monitor, Smartphone, Layers as LayersIcon, Sparkles,
  Type, Image as ImageIcon2, Square, MousePointerClick,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/admin/Drawer';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SlideRenderer } from '@/components/business/SlideRenderer';
import {
  useAdminBusinessSlides,
  useAdminBusinessSlideDetail,
  useCreateBusinessSlide,
  useUpdateBusinessSlide,
  useDeleteBusinessSlide,
  useDuplicateBusinessSlide,
  useReorderBusinessSlides,
  useCreateSlideLayer,
  useUpdateSlideLayer,
  useDeleteSlideLayer,
  useReorderSlideLayers,
} from '@/hooks/useBusinessSlides';
import { businessSlideService, getSlideImageUrl } from '@/services/business-slide.service';
import { useToast } from '@/providers/useToast';
import { cn } from '@/lib/cn';
import type {
  BusinessSlideListItem,
  BusinessSlideDetail,
  BusinessSlideLayer,
  CreateBusinessSlideInput,
  UpdateBusinessSlideInput,
  SlideLayerType,
  SlideAnimationType,
  SlideContentPosition,
  SlideTextColor,
  SlideLinkType,
} from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const ANIMATION_OPTIONS: Array<{ label: string; value: SlideAnimationType }> = [
  { label: 'محو شدن', value: 'fade' },
  { label: 'اسلاید', value: 'slide' },
  { label: 'زوم', value: 'zoom' },
  { label: 'محو + اسلاید', value: 'fade-slide' },
  { label: 'بدون انیمیشن', value: 'none' },
];

const POSITION_OPTIONS: Array<{ label: string; value: SlideContentPosition }> = [
  { label: 'راست', value: 'right' },
  { label: 'وسط', value: 'center' },
  { label: 'چپ', value: 'left' },
];

const TEXT_COLOR_OPTIONS: Array<{ label: string; value: SlideTextColor }> = [
  { label: 'روشن (سفید)', value: 'light' },
  { label: 'تیره', value: 'dark' },
];

const LINK_TYPE_OPTIONS: Array<{ label: string; value: SlideLinkType }> = [
  { label: 'بدون لینک', value: 'none' },
  { label: 'کسب‌وکار', value: 'business' },
  { label: 'دسته‌بندی', value: 'category' },
  { label: 'لینک سفارشی', value: 'custom' },
];

const LAYER_TYPE_OPTIONS: Array<{ label: string; value: SlideLayerType; icon: typeof ImageIcon2 }> = [
  { label: 'تصویر', value: 'image', icon: ImageIcon2 },
  { label: 'متن', value: 'text', icon: Type },
  { label: 'دکمه', value: 'button', icon: MousePointerClick },
  { label: 'تزئینی', value: 'decorative', icon: Square },
];

type TabKey = 'general' | 'content' | 'images' | 'appearance' | 'linking' | 'layers' | 'preview';

const TABS: Array<{ key: TabKey; label: string; icon: typeof LayersIcon }> = [
  { key: 'general', label: 'عمومی', icon: Check },
  { key: 'content', label: 'محتوا', icon: Type },
  { key: 'images', label: 'تصاویر', icon: ImageIcon },
  { key: 'appearance', label: 'ظاهر', icon: Sparkles },
  { key: 'linking', label: 'لینک', icon: MousePointerClick },
  { key: 'layers', label: 'لایه‌ها', icon: LayersIcon },
  { key: 'preview', label: 'پیش‌نمایش', icon: Eye },
];

interface SlideFormState {
  internalName: string;
  title: string;
  eyebrow: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  cta2Text: string;
  cta2Url: string;
  backgroundImagePath: string | null;
  mainImagePath: string | null;
  mobileImagePath: string | null;
  overlayOpacity: number;
  contentPosition: SlideContentPosition;
  textColor: SlideTextColor;
  animationType: SlideAnimationType;
  durationMs: number;
  transitionMs: number;
  sortOrder: number;
  isActive: boolean;
  isPublished: boolean;
  startsAt: string;
  endsAt: string;
  linkType: SlideLinkType;
  linkBusinessId: string | null;
  linkCategoryId: string | null;
  linkCustomUrl: string;
}

function emptyForm(sortOrder: number): SlideFormState {
  return {
    internalName: '',
    title: '',
    eyebrow: '',
    description: '',
    ctaText: '',
    ctaUrl: '',
    cta2Text: '',
    cta2Url: '',
    backgroundImagePath: null,
    mainImagePath: null,
    mobileImagePath: null,
    overlayOpacity: 40,
    contentPosition: 'right',
    textColor: 'light',
    animationType: 'fade-slide',
    durationMs: 6000,
    transitionMs: 600,
    sortOrder,
    isActive: true,
    isPublished: false,
    startsAt: '',
    endsAt: '',
    linkType: 'none',
    linkBusinessId: null,
    linkCategoryId: null,
    linkCustomUrl: '',
  };
}

function slideDetailToForm(s: BusinessSlideDetail): SlideFormState {
  return {
    internalName: s.internalName,
    title: s.title ?? '',
    eyebrow: s.eyebrow ?? '',
    description: s.description ?? '',
    ctaText: s.ctaText ?? '',
    ctaUrl: s.ctaUrl ?? '',
    cta2Text: s.cta2Text ?? '',
    cta2Url: s.cta2Url ?? '',
    backgroundImagePath: s.backgroundImagePath,
    mainImagePath: s.mainImagePath,
    mobileImagePath: s.mobileImagePath,
    overlayOpacity: s.overlayOpacity,
    contentPosition: s.contentPosition,
    textColor: s.textColor,
    animationType: s.animationType,
    durationMs: s.durationMs,
    transitionMs: s.transitionMs,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
    isPublished: s.isPublished,
    startsAt: s.startsAt ? s.startsAt.slice(0, 16) : '',
    endsAt: s.endsAt ? s.endsAt.slice(0, 16) : '',
    linkType: s.linkType,
    linkBusinessId: s.linkBusinessId,
    linkCategoryId: s.linkCategoryId,
    linkCustomUrl: s.linkCustomUrl ?? '',
  };
}

function formToCreateInput(form: SlideFormState): CreateBusinessSlideInput {
  return {
    internalName: form.internalName.trim(),
    title: form.title.trim() || null,
    eyebrow: form.eyebrow.trim() || null,
    description: form.description.trim() || null,
    ctaText: form.ctaText.trim() || null,
    ctaUrl: form.ctaUrl.trim() || null,
    cta2Text: form.cta2Text.trim() || null,
    cta2Url: form.cta2Url.trim() || null,
    backgroundImagePath: form.backgroundImagePath,
    mainImagePath: form.mainImagePath,
    mobileImagePath: form.mobileImagePath,
    overlayOpacity: form.overlayOpacity,
    contentPosition: form.contentPosition,
    textColor: form.textColor,
    animationType: form.animationType,
    durationMs: form.durationMs,
    transitionMs: form.transitionMs,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
    isPublished: form.isPublished,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    linkType: form.linkType,
    linkBusinessId: form.linkType === 'business' ? form.linkBusinessId : null,
    linkCategoryId: form.linkType === 'category' ? form.linkCategoryId : null,
    linkCustomUrl: form.linkType === 'custom' ? form.linkCustomUrl.trim() || null : null,
  };
}

function formToUpdateInput(form: SlideFormState, isCreate: boolean): UpdateBusinessSlideInput {
  const input: UpdateBusinessSlideInput = {
    ...formToCreateInput(form),
    clearStartsAt: !form.startsAt,
    clearEndsAt: !form.endsAt,
    clearBackgroundImage: !form.backgroundImagePath,
    clearMainImage: !form.mainImagePath,
    clearMobileImage: !form.mobileImagePath,
    clearLinkBusinessId: form.linkType !== 'business' || !form.linkBusinessId,
    clearLinkCategoryId: form.linkType !== 'category' || !form.linkCategoryId,
    clearLinkCustomUrl: form.linkType !== 'custom' || !form.linkCustomUrl,
  };
  if (isCreate) delete (input as Record<string, unknown>).clearStartsAt;
  return input;
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

// ─── Image Upload Field ──────────────────────────────────────────

function ImageUploadField({
  label,
  hint,
  imagePath,
  onUploaded,
  onRemoved,
  uploadType,
  previewClass,
}: {
  label: string;
  hint: string;
  imagePath: string | null;
  onUploaded: (path: string) => void;
  onRemoved: () => void;
  uploadType: 'background' | 'main' | 'mobile' | 'layer';
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
      const { path, error } = await businessSlideService.uploadImage(file, uploadType);
      if (path) {
        onUploaded(path);
        toast.success('تصویر آپلود شد');
      } else {
        setUploadError(error ?? 'تصویر آپلود نشد');
      }
    } finally {
      setUploading(false);
    }
  };

  const imageUrl = getSlideImageUrl(imagePath);

  return (
    <div>
      <label className="text-sm font-medium text-neutral-600">{label}</label>
      <p className="text-xs text-neutral-400 mt-0.5 mb-2">{hint}</p>
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0', previewClass)}>
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

// ─── Slide Row ───────────────────────────────────────────────────

function SlideRow({
  slide,
  index,
  total,
  onEdit,
  onMove,
  onToggleActive,
  onTogglePublished,
  onDelete,
  onDuplicate,
}: {
  slide: BusinessSlideListItem;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggleActive: () => void;
  onTogglePublished: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const thumbUrl = getSlideImageUrl(slide.backgroundImagePath ?? slide.mainImagePath);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-20 h-12 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0">
          {thumbUrl ? (
            <img src={thumbUrl} alt={slide.internalName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-5 h-5 rounded bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </span>
            <h4 className="text-sm font-bold text-neutral-800 truncate">
              {slide.internalName}
            </h4>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0',
              slide.isActive ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-400',
            )}>
              {slide.isActive ? 'فعال' : 'غیرفعال'}
            </span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0',
              slide.isPublished ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700',
            )}>
              {slide.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
            {slide.title && <span className="truncate">{slide.title}</span>}
            {slide.layerCount > 0 && (
              <>
                <span className="text-neutral-200">|</span>
                <span className="flex items-center gap-0.5">
                  <LayersIcon className="w-3 h-3" />
                  {slide.layerCount} لایه
                </span>
              </>
            )}
          </div>
        </div>

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
            className={cn(
              'w-7 h-7 rounded-lg border flex items-center justify-center transition-colors',
              slide.isActive
                ? 'bg-success-50 border-success-300 text-success-600'
                : 'bg-neutral-50 border-neutral-200 text-neutral-400',
            )}
            aria-label="فعال/غیرفعال"
          >
            {slide.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onTogglePublished}
            className={cn(
              'w-7 h-7 rounded-lg border flex items-center justify-center transition-colors',
              slide.isPublished
                ? 'bg-primary-50 border-primary-300 text-primary-600'
                : 'bg-amber-50 border-amber-300 text-amber-600',
            )}
            aria-label="منتشر/پیش‌نویس"
          >
            {slide.isPublished ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDuplicate}
            className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
            aria-label="کپی"
          >
            <Copy className="w-3.5 h-3.5" />
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
                تایید
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

// ─── Layer Editor ────────────────────────────────────────────────

function LayerEditor({
  layer,
  onSave,
  onCancel,
}: {
  layer: Partial<BusinessSlideLayer> | null;
  onSave: (data: {
    layerType: SlideLayerType;
    content: string | null;
    imagePath: string | null;
    linkUrl: string | null;
    positionX: number;
    positionY: number;
    width: number | null;
    zIndex: number;
    animationDelayMs: number;
    animationType: SlideAnimationType;
    isVisible: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [layerType, setLayerType] = useState<SlideLayerType>(layer?.layerType ?? 'image');
  const [content, setContent] = useState(layer?.content ?? '');
  const [imagePath, setImagePath] = useState(layer?.imagePath ?? null);
  const [linkUrl, setLinkUrl] = useState(layer?.linkUrl ?? '');
  const [positionX, setPositionX] = useState(layer?.positionX ?? 50);
  const [positionY, setPositionY] = useState(layer?.positionY ?? 50);
  const [width, setWidth] = useState(layer?.width ?? 30);
  const [zIndex, setZIndex] = useState(layer?.zIndex ?? 0);
  const [animationDelayMs, setAnimationDelayMs] = useState(layer?.animationDelayMs ?? 0);
  const [animationType, setAnimationType] = useState<SlideAnimationType>(layer?.animationType ?? 'fade-slide');
  const [isVisible, setIsVisible] = useState(layer?.isVisible ?? true);

  return (
    <div className="rounded-xl border-2 border-primary-200 bg-primary-50/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-primary-700">
          {layer?.id ? 'ویرایش لایه' : 'لایه جدید'}
        </span>
        <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">نوع لایه</label>
        <select
          value={layerType}
          onChange={(e) => setLayerType(e.target.value as SlideLayerType)}
          className="w-full h-9 px-2 rounded-lg border border-neutral-200 bg-white text-sm"
        >
          {LAYER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {layerType === 'image' && (
        <ImageUploadField
          label="تصویر لایه"
          hint="تصویر این لایه"
          imagePath={imagePath}
          onUploaded={setImagePath}
          onRemoved={() => setImagePath(null)}
          uploadType="layer"
          previewClass="w-20 h-12"
        />
      )}

      {(layerType === 'text' || layerType === 'button') && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">متن</label>
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={layerType === 'button' ? 'متن دکمه' : 'متن لایه'}
          />
        </div>
      )}

      {layerType === 'button' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">لینک دکمه</label>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="/businesses"
            dir="ltr"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">موقعیت X ({positionX}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={positionX}
            onChange={(e) => setPositionX(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">موقعیت Y ({positionY}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={positionY}
            onChange={(e) => setPositionY(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {layerType === 'image' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">عرض ({width}%)</label>
          <input
            type="range"
            min={5}
            max={100}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">ترتیب z</label>
          <Input
            type="number"
            value={zIndex}
            onChange={(e) => setZIndex(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">تأخیر انیمیشن (ms)</label>
          <Input
            type="number"
            value={animationDelayMs}
            onChange={(e) => setAnimationDelayMs(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">انیمیشن</label>
        <select
          value={animationType}
          onChange={(e) => setAnimationType(e.target.value as SlideAnimationType)}
          className="w-full h-9 px-2 rounded-lg border border-neutral-200 bg-white text-sm"
        >
          {ANIMATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-500">قابل دیدن</label>
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors',
            isVisible
              ? 'bg-success-50 border-success-300 text-success-700'
              : 'bg-neutral-50 border-neutral-200 text-neutral-400',
          )}
        >
          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isVisible ? 'بله' : 'خیر'}
        </button>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            onSave({
              layerType,
              content: content.trim() || null,
              imagePath,
              linkUrl: linkUrl.trim() || null,
              positionX,
              positionY,
              width: layerType === 'image' ? width : null,
              zIndex,
              animationDelayMs,
              animationType,
              isVisible,
            })
          }
        >
          <Check className="w-3.5 h-3.5" />
          ذخیره لایه
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  index,
  total,
  onEdit,
  onMove,
  onToggleVisible,
  onDelete,
}: {
  layer: BusinessSlideLayer;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}) {
  const typeOption = LAYER_TYPE_OPTIONS.find((o) => o.value === layer.layerType);
  const Icon = typeOption?.icon ?? Square;
  const preview = layer.content || (layer.imagePath ? 'تصویر' : 'تزئینی');

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
      <span className="w-5 h-5 rounded bg-neutral-100 text-neutral-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>
      <Icon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
      <span className="text-xs text-neutral-600 truncate flex-1">{preview}</span>
      <button
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="w-6 h-6 rounded border border-neutral-200 flex items-center justify-center text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
      >
        <ArrowUp className="w-3 h-3" />
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        className="w-6 h-6 rounded border border-neutral-200 flex items-center justify-center text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
      >
        <ArrowDown className="w-3 h-3" />
      </button>
      <button
        onClick={onToggleVisible}
        className={cn(
          'w-6 h-6 rounded border flex items-center justify-center transition-colors',
          layer.isVisible
            ? 'bg-success-50 border-success-300 text-success-600'
            : 'bg-neutral-50 border-neutral-200 text-neutral-400',
        )}
      >
        {layer.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      </button>
      <button
        onClick={onEdit}
        className="w-6 h-6 rounded border border-primary-200 flex items-center justify-center text-primary-600 hover:bg-primary-50"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={onDelete}
        className="w-6 h-6 rounded border border-error-200 flex items-center justify-center text-error-500 hover:bg-error-50"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────

export function AdminBusinessSliderPage() {
  const { data: slides, isLoading, error: fetchError } = useAdminBusinessSlides();
  const createMutation = useCreateBusinessSlide();
  const updateMutation = useUpdateBusinessSlide();
  const deleteMutation = useDeleteBusinessSlide();
  const duplicateMutation = useDuplicateBusinessSlide();
  const reorderMutation = useReorderBusinessSlides();
  const createLayerMutation = useCreateSlideLayer();
  const updateLayerMutation = useUpdateSlideLayer();
  const deleteLayerMutation = useDeleteSlideLayer();
  const reorderLayersMutation = useReorderSlideLayers();
  const toast = useToast();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideFormState>(emptyForm(0));
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [layers, setLayers] = useState<BusinessSlideLayer[]>([]);
  const [editingLayer, setEditingLayer] = useState<Partial<BusinessSlideLayer> | null>(null);
  const [showLayerEditor, setShowLayerEditor] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const allSlides = slides ?? [];

  const { data: slideDetail } = useAdminBusinessSlideDetail(
    mode === 'edit' && drawerOpen ? editingId : null,
  );

  // Load slide detail into form when editing
  const lastLoadedId = useRef<string | null>(null);
  if (slideDetail && slideDetail.id !== lastLoadedId.current && mode === 'edit') {
    lastLoadedId.current = slideDetail.id;
    setForm(slideDetailToForm(slideDetail));
    setLayers(slideDetail.layers);
  }

  const patchForm = useCallback((patch: Partial<SlideFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const openCreate = () => {
    const maxSort = allSlides.length > 0 ? Math.max(...allSlides.map((s) => s.sortOrder)) : -1;
    setForm(emptyForm(maxSort + 1));
    setLayers([]);
    setMode('create');
    setEditingId(null);
    lastLoadedId.current = null;
    setActiveTab('general');
    setDrawerOpen(true);
  };

  const openEdit = (slide: BusinessSlideListItem) => {
    setMode('edit');
    setEditingId(slide.id);
    lastLoadedId.current = null;
    setForm(emptyForm(0));
    setLayers([]);
    setActiveTab('general');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    setLayers([]);
    setShowLayerEditor(false);
    setEditingLayer(null);
  };

  const handleSave = async () => {
    if (!form.internalName.trim()) {
      toast.error('نام داخلی اسلاید الزامی است');
      setActiveTab('general');
      return;
    }

    try {
      if (mode === 'create') {
        const input = formToCreateInput(form);
        const result = await createMutation.mutateAsync(input);
        if (result.id) {
          setEditingId(result.id);
          setMode('edit');
          toast.success('اسلاید ایجاد شد');
        }
      } else if (editingId) {
        const input = formToUpdateInput(form, false);
        await updateMutation.mutateAsync({ slideId: editingId, input });
        toast.success('تغییرات ذخیره شد');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unauthorized')) {
        toast.error('دسترسی لازم وجود ندارد');
      } else {
        toast.error('ذخیره اسلاید انجام نشد');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('اسلاید حذف شد');
      if (editingId === id) closeDrawer();
    } catch {
      toast.error('حذف انجام نشد');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateMutation.mutateAsync(id);
      toast.success('اسلاید کپی شد');
    } catch {
      toast.error('کپی انجام نشد');
    }
  };

  const handleMove = async (id: string, dir: -1 | 1) => {
    const idx = allSlides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= allSlides.length) return;
    const a = allSlides[idx];
    const b = allSlides[target];
    try {
      await reorderMutation.mutateAsync([
        { id: a.id, sortOrder: b.sortOrder },
        { id: b.id, sortOrder: a.sortOrder },
      ]);
    } catch {
      toast.error('تغییر ترتیب انجام نشد');
    }
  };

  const handleToggleActive = async (slide: BusinessSlideListItem) => {
    if (mode === 'edit' && editingId === slide.id) {
      patchForm({ isActive: !slide.isActive });
    }
    try {
      await updateMutation.mutateAsync({
        slideId: slide.id,
        input: { isActive: !slide.isActive },
      });
      toast.success(slide.isActive ? 'غیرفعال شد' : 'فعال شد');
    } catch {
      toast.error('تغییر وضعیت انجام نشد');
    }
  };

  const handleTogglePublished = async (slide: BusinessSlideListItem) => {
    if (mode === 'edit' && editingId === slide.id) {
      patchForm({ isPublished: !slide.isPublished });
    }
    try {
      await updateMutation.mutateAsync({
        slideId: slide.id,
        input: { isPublished: !slide.isPublished },
      });
      toast.success(slide.isPublished ? 'پیش‌نویس شد' : 'منتشر شد');
    } catch {
      toast.error('تغییر وضعیت انجام نشد');
    }
  };

  // ─── Layer handlers ─────────────────────────────────────────

  const handleSaveLayer = async (data: {
    layerType: SlideLayerType;
    content: string | null;
    imagePath: string | null;
    linkUrl: string | null;
    positionX: number;
    positionY: number;
    width: number | null;
    zIndex: number;
    animationDelayMs: number;
    animationType: SlideAnimationType;
    isVisible: boolean;
  }) => {
    if (!editingId) {
      toast.error('ابتدا اسلاید را ذخیره کنید');
      return;
    }

    try {
      if (editingLayer?.id) {
        await updateLayerMutation.mutateAsync({
          layerId: editingLayer.id,
          input: {
            layerType: data.layerType,
            content: data.content,
            imagePath: data.imagePath,
            linkUrl: data.linkUrl,
            positionX: data.positionX,
            positionY: data.positionY,
            width: data.width,
            zIndex: data.zIndex,
            animationDelayMs: data.animationDelayMs,
            animationType: data.animationType,
            isVisible: data.isVisible,
            clearContent: !data.content,
            clearImage: !data.imagePath,
            clearLinkUrl: !data.linkUrl,
            clearWidth: data.width === null,
          },
        });
        toast.success('لایه به‌روزرسانی شد');
      } else {
        await createLayerMutation.mutateAsync({
          slideId: editingId,
          layerType: data.layerType,
          content: data.content,
          imagePath: data.imagePath,
          linkUrl: data.linkUrl,
          positionX: data.positionX,
          positionY: data.positionY,
          width: data.width,
          zIndex: data.zIndex,
          animationDelayMs: data.animationDelayMs,
          animationType: data.animationType,
          isVisible: data.isVisible,
        });
        toast.success('لایه ایجاد شد');
      }
      setShowLayerEditor(false);
      setEditingLayer(null);
      // Refresh detail
      lastLoadedId.current = null;
    } catch {
      toast.error('ذخیره لایه انجام نشد');
    }
  };

  const handleLayerMove = async (layerId: string, dir: -1 | 1) => {
    if (!editingId) return;
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= layers.length) return;
    const a = layers[idx];
    const b = layers[target];
    try {
      await reorderLayersMutation.mutateAsync({
        slideId: editingId,
        items: [
          { id: a.id, sortOrder: b.sortOrder },
          { id: b.id, sortOrder: a.sortOrder },
        ],
      });
      lastLoadedId.current = null;
    } catch {
      toast.error('تغییر ترتیب لایه انجام نشد');
    }
  };

  const handleLayerToggleVisible = async (layer: BusinessSlideLayer) => {
    try {
      await updateLayerMutation.mutateAsync({
        layerId: layer.id,
        input: { isVisible: !layer.isVisible },
      });
      lastLoadedId.current = null;
    } catch {
      toast.error('تغییر وضعیت لایه انجام نشد');
    }
  };

  const handleLayerDelete = async (layerId: string) => {
    try {
      await deleteLayerMutation.mutateAsync(layerId);
      toast.success('لایه حذف شد');
      lastLoadedId.current = null;
    } catch {
      toast.error('حذف لایه انجام نشد');
    }
  };

  // Build preview slide from current form
  const previewSlide = {
    id: 'preview',
    internalName: form.internalName,
    title: form.title || null,
    eyebrow: form.eyebrow || null,
    description: form.description || null,
    ctaText: form.ctaText || null,
    ctaUrl: form.ctaUrl || null,
    cta2Text: form.cta2Text || null,
    cta2Url: form.cta2Url || null,
    backgroundImagePath: form.backgroundImagePath,
    mainImagePath: form.mainImagePath,
    mobileImagePath: form.mobileImagePath,
    overlayOpacity: form.overlayOpacity,
    contentPosition: form.contentPosition,
    textColor: form.textColor,
    animationType: form.animationType,
    durationMs: form.durationMs,
    transitionMs: form.transitionMs,
    sortOrder: form.sortOrder,
    linkType: form.linkType,
    linkBusinessId: form.linkBusinessId,
    linkCategoryId: form.linkCategoryId,
    linkCustomUrl: form.linkCustomUrl || null,
    layers,
  };

  if (isLoading) {
    return (
      <div>
        <AdminPageHeader title="اسلایدر کسب‌وکار" description="مدیریت اسلایدهای تبلیغاتی صفحه کسب‌وکار" />
        <Card className="p-5">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        </Card>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <AdminPageHeader title="اسلایدر کسب‌وکار" description="مدیریت اسلایدهای تبلیغاتی صفحه کسب‌وکار" />
        <Card className="p-5">
          <div className="flex flex-col items-center justify-center py-8 text-error-600 gap-2">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm">بارگذاری اسلایدها انجام نشد. صفحه را دوباره بارگذاری کنید.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="اسلایدر کسب‌وکار" description="مدیریت اسلایدهای تبلیغاتی صفحه کسب‌وکار" />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
          <h3 className="text-base font-bold text-neutral-800">اسلایدها</h3>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            افزودن اسلاید
          </Button>
        </div>

        <div className="space-y-2">
          {allSlides.map((slide, idx) => (
            <SlideRow
              key={slide.id}
              slide={slide}
              index={idx}
              total={allSlides.length}
              onEdit={() => openEdit(slide)}
              onMove={(dir) => handleMove(slide.id, dir)}
              onToggleActive={() => handleToggleActive(slide)}
              onTogglePublished={() => handleTogglePublished(slide)}
              onDelete={() => handleDelete(slide.id)}
              onDuplicate={() => handleDuplicate(slide.id)}
            />
          ))}
          {allSlides.length === 0 && (
            <div className="text-center py-8 text-neutral-400 text-sm">
              هنوز اسلایدی وجود ندارد. روی «افزودن اسلاید» کلیک کنید.
            </div>
          )}
        </div>
      </Card>

      {/* ─── Edit/Create Drawer ─── */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={mode === 'create' ? 'اسلاید جدید' : 'ویرایش اسلاید'}
        width="max-w-2xl"
      >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-neutral-200 px-3 overflow-x-auto shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* General */}
            {activeTab === 'general' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">نام داخلی (الزامی)</label>
                  <Input
                    value={form.internalName}
                    onChange={(e) => patchForm({ internalName: e.target.value })}
                    placeholder="مثلاً: تخفیف ویژه تابستانه"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">ترتیب نمایش</label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => patchForm({ sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-600">فعال</label>
                  <button
                    type="button"
                    onClick={() => patchForm({ isActive: !form.isActive })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      form.isActive
                        ? 'bg-success-50 border-success-300 text-success-700'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-500',
                    )}
                  >
                    {form.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {form.isActive ? 'فعال' : 'غیرفعال'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-600">منتشر شده</label>
                  <button
                    type="button"
                    onClick={() => patchForm({ isPublished: !form.isPublished })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      form.isPublished
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-amber-50 border-amber-300 text-amber-700',
                    )}
                  >
                    {form.isPublished ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    {form.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">تاریخ شروع (اختیاری)</label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => patchForm({ startsAt: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">تاریخ پایان (اختیاری)</label>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => patchForm({ endsAt: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {activeTab === 'content' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">متن بالا (Eyebrow)</label>
                  <Input
                    value={form.eyebrow}
                    onChange={(e) => patchForm({ eyebrow: e.target.value })}
                    placeholder="مثلاً: پیشنهاد ویژه"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">عنوان</label>
                  <Input
                    value={form.title}
                    onChange={(e) => patchForm({ title: e.target.value })}
                    placeholder="عنوان اصلی اسلاید"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">توضیحات</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => patchForm({ description: e.target.value })}
                    placeholder="متن توضیحات"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">متن دکمه اصلی</label>
                    <Input
                      value={form.ctaText}
                      onChange={(e) => patchForm({ ctaText: e.target.value })}
                      placeholder="مشاهده"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">لینک دکمه اصلی</label>
                    <Input
                      value={form.ctaUrl}
                      onChange={(e) => patchForm({ ctaUrl: e.target.value })}
                      placeholder="/businesses"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">متن دکمه دوم (اختیاری)</label>
                    <Input
                      value={form.cta2Text}
                      onChange={(e) => patchForm({ cta2Text: e.target.value })}
                      placeholder="بیشتر بدانید"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">لینک دکمه دوم</label>
                    <Input
                      value={form.cta2Url}
                      onChange={(e) => patchForm({ cta2Url: e.target.value })}
                      placeholder="/about"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                <ImageUploadField
                  label="تصویر پس‌زمینه"
                  hint="تصویر پس‌زمینه اسلاید — عرض کامل"
                  imagePath={form.backgroundImagePath}
                  onUploaded={(path) => patchForm({ backgroundImagePath: path })}
                  onRemoved={() => patchForm({ backgroundImagePath: null })}
                  uploadType="background"
                  previewClass="w-40 h-16"
                />
                <ImageUploadField
                  label="تصویر اصلی (اختیاری)"
                  hint="تصویر اصلی کنار متن — شفاف با پس‌زمینه مناسب"
                  imagePath={form.mainImagePath}
                  onUploaded={(path) => patchForm({ mainImagePath: path })}
                  onRemoved={() => patchForm({ mainImagePath: null })}
                  uploadType="main"
                  previewClass="w-24 h-16"
                />
                <ImageUploadField
                  label="تصویر موبایل (اختیاری)"
                  hint="تصویر اختصاصی موبایل — در صورت خالی بودن، پس‌زمینه استفاده می‌شود"
                  imagePath={form.mobileImagePath}
                  onUploaded={(path) => patchForm({ mobileImagePath: path })}
                  onRemoved={() => patchForm({ mobileImagePath: null })}
                  uploadType="mobile"
                  previewClass="w-20 h-16"
                />
              </div>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">موقعیت محتوا</label>
                  <select
                    value={form.contentPosition}
                    onChange={(e) => patchForm({ contentPosition: e.target.value as SlideContentPosition })}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">رنگ متن</label>
                  <select
                    value={form.textColor}
                    onChange={(e) => patchForm({ textColor: e.target.value as SlideTextColor })}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                  >
                    {TEXT_COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">شفافیت پس‌زمینه تیره ({form.overlayOpacity}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.overlayOpacity}
                    onChange={(e) => patchForm({ overlayOpacity: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">نوع انیمیشن</label>
                  <select
                    value={form.animationType}
                    onChange={(e) => patchForm({ animationType: e.target.value as SlideAnimationType })}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                  >
                    {ANIMATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">مدت نمایش (ms)</label>
                    <Input
                      type="number"
                      value={form.durationMs}
                      onChange={(e) => patchForm({ durationMs: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">سرعت انتقال (ms)</label>
                    <Input
                      type="number"
                      value={form.transitionMs}
                      onChange={(e) => patchForm({ transitionMs: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Linking */}
            {activeTab === 'linking' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-600">نوع لینک</label>
                  <select
                    value={form.linkType}
                    onChange={(e) => patchForm({ linkType: e.target.value as SlideLinkType })}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                  >
                    {LINK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {form.linkType === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">لینک سفارشی</label>
                    <Input
                      value={form.linkCustomUrl}
                      onChange={(e) => patchForm({ linkCustomUrl: e.target.value })}
                      placeholder="/businesses?category=..."
                      dir="ltr"
                    />
                  </div>
                )}
                {form.linkType === 'business' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">شناسه کسب‌وکار</label>
                    <Input
                      value={form.linkBusinessId ?? ''}
                      onChange={(e) => patchForm({ linkBusinessId: e.target.value || null })}
                      placeholder="UUID"
                      dir="ltr"
                    />
                  </div>
                )}
                {form.linkType === 'category' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-600">شناسه دسته‌بندی</label>
                    <Input
                      value={form.linkCategoryId ?? ''}
                      onChange={(e) => patchForm({ linkCategoryId: e.target.value || null })}
                      placeholder="UUID"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Layers */}
            {activeTab === 'layers' && (
              <div className="space-y-3">
                {!editingId && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ابتدا اسلاید را ذخیره کنید تا بتوانید لایه اضافه کنید.
                  </div>
                )}
                {showLayerEditor && editingId && (
                  <LayerEditor
                    layer={editingLayer}
                    onSave={handleSaveLayer}
                    onCancel={() => { setShowLayerEditor(false); setEditingLayer(null); }}
                  />
                )}
                {!showLayerEditor && editingId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setEditingLayer(null); setShowLayerEditor(true); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن لایه
                  </Button>
                )}
                <div className="space-y-2">
                  {layers.map((layer, idx) => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      index={idx}
                      total={layers.length}
                      onEdit={() => { setEditingLayer(layer); setShowLayerEditor(true); }}
                      onMove={(dir) => handleLayerMove(layer.id, dir)}
                      onToggleVisible={() => handleLayerToggleVisible(layer)}
                      onDelete={() => handleLayerDelete(layer.id)}
                    />
                  ))}
                  {layers.length === 0 && !showLayerEditor && editingId && (
                    <p className="text-center py-4 text-xs text-neutral-400">
                      لایه‌ای وجود ندارد. لایه‌های اضافی برای غنی‌سازی اسلاید اضافه کنید.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            {activeTab === 'preview' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      previewDevice === 'desktop'
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-500',
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    دسکتاپ
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      previewDevice === 'mobile'
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-500',
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    موبایل
                  </button>
                </div>
                <div
                  className={cn(
                    'relative rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200',
                    previewDevice === 'desktop' ? 'h-[280px]' : 'h-[200px] max-w-[400px] mx-auto',
                  )}
                >
                  <SlideRenderer
                    slide={previewSlide}
                    isActive={true}
                    isMobile={previewDevice === 'mobile'}
                    eager={true}
                    reducedMotion={false}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="flex items-center gap-2 p-3 border-t border-neutral-200 shrink-0">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {mode === 'create' ? 'ایجاد اسلاید' : 'ذخیره تغییرات'}
            </Button>
            <Button variant="ghost" onClick={closeDrawer}>
              بستن
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
