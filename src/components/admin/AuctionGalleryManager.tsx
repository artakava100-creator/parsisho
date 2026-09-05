import { useState, useRef, useEffect } from 'react';
import { Upload, X, ImageIcon, Loader2, AlertCircle, ArrowRight, ArrowLeft, Star } from 'lucide-react';
import { useToast } from '@/providers/useToast';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { AuctionMedia } from '@/types';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface GalleryImage {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
  isExisting: boolean;
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

async function uploadAuctionImage(file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `auction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('homepage-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (upErr) {
      logger.error('[auction.uploadImage]', upErr);
      return { url: null, error: upErr.message };
    }
    const { data: pub } = supabase.storage.from('homepage-images').getPublicUrl(fileName);
    return { url: pub.publicUrl, error: null };
  } catch {
    return { url: null, error: 'خطای غیرمنتظره' };
  }
}

function toGalleryImages(media: AuctionMedia[]): GalleryImage[] {
  return media.map((m) => ({
    id: m.id,
    url: m.url,
    sortOrder: m.sortOrder,
    isPrimary: m.isPrimary,
    isExisting: true,
  }));
}

/**
 * AuctionGalleryManager — admin UI for managing up to 5 auction images.
 *
 * Create mode (auctionId = null):
 *   Images are buffered locally as pending. The parent form calls
 *   `getPendingImages()` on submit to persist them after the auction is created.
 *
 * Edit mode (auctionId provided):
 *   Existing auction_media rows are loaded and mutations hit the DB immediately.
 *   The parent form still calls `getPrimaryUrl()` to sync auctions.image_url.
 */
export function AuctionGalleryManager({
  auctionId,
  legacyImageUrl,
  onPrimaryChange,
  getPendingImages,
  getPrimaryUrl,
}: {
  auctionId: string | null;
  legacyImageUrl: string | null;
  onPrimaryChange?: (url: string | null) => void;
  getPendingImages?: (images: { url: string; sortOrder: number; isPrimary: boolean }[]) => void;
  getPrimaryUrl?: (fn: () => string | null) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load existing media in edit mode
  useEffect(() => {
    if (!auctionId) {
      // Create mode: if legacy image exists, seed it as a pending image
      if (legacyImageUrl && images.length === 0) {
        setImages([{
          id: `pending-legacy`,
          url: legacyImageUrl,
          sortOrder: 0,
          isPrimary: true,
          isExisting: false,
        }]);
      }
      return;
    }

    // Edit mode: fetch from DB
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('auction_media')
        .select('*')
        .eq('auction_id', auctionId)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (error) {
        logger.error('[AuctionGalleryManager] fetch', error);
        return;
      }
      const mediaRows = (data || []) as unknown as AuctionMedia[];
      if (mediaRows.length > 0) {
        setImages(toGalleryImages(mediaRows));
      } else if (legacyImageUrl && images.length === 0) {
        // Legacy auction with only image_url — show as pending
        setImages([{
          id: `pending-legacy`,
          url: legacyImageUrl,
          sortOrder: 0,
          isPrimary: true,
          isExisting: false,
        }]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  // Expose pending images and primary URL getter to parent
  useEffect(() => {
    if (getPendingImages) {
      getPendingImages(
        images
          .filter((img) => !img.isExisting)
          .map((img) => ({ url: img.url, sortOrder: img.sortOrder, isPrimary: img.isPrimary }))
      );
    }
  }, [images, getPendingImages]);

  useEffect(() => {
    if (getPrimaryUrl) {
      getPrimaryUrl(() => images.find((img) => img.isPrimary)?.url ?? null);
    }
  }, [images, getPrimaryUrl]);

  // Notify parent of primary URL changes
  useEffect(() => {
    if (onPrimaryChange) {
      const primary = images.find((img) => img.isPrimary);
      onPrimaryChange(primary?.url ?? null);
    }
  }, [images, onPrimaryChange]);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setUploadError('حداکثر ۵ تصویر مجاز است');
      return;
    }

    setUploading(true);
    try {
      const { url, error } = await uploadAuctionImage(file);
      if (!url) {
        setUploadError(error ?? 'تصویر آپلود نشد');
        return;
      }

      const newImage: GalleryImage = {
        id: `pending-${Date.now()}`,
        url,
        sortOrder: images.length,
        isPrimary: images.length === 0,
        isExisting: false,
      };

      setImages((prev) => [...prev, newImage]);
      toast.success('تصویر اضافه شد');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    // If existing in DB, delete from DB
    if (image.isExisting && auctionId) {
      const { error } = await supabase
        .from('auction_media')
        .delete()
        .eq('id', imageId);
      if (error) {
        toast.error('خطا', 'حذف تصویر ناموفق بود');
        return;
      }
    }

    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== imageId);
      // Re-index sort order and set first as primary
      return filtered.map((img, idx) => ({
        ...img,
        sortOrder: idx,
        isPrimary: idx === 0,
      }));
    });

    // If we reordered existing DB rows, persist the new sort orders
    if (auctionId) {
      const updated = images
        .filter((img) => img.id !== imageId)
        .map((img, idx) => ({ id: img.id, sort_order: idx, is_primary: idx === 0 }))
        .filter((item) => images.find((img) => img.id === item.id)?.isExisting);
      if (updated.length > 0) {
        await auctionMediaServiceReorder(updated);
      }
    }

    toast.success('تصویر حذف شد');
  };

  const handleMove = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    // Re-index: first image is always primary
    const reindexed = reordered.map((img, idx) => ({
      ...img,
      sortOrder: idx,
      isPrimary: idx === 0,
    }));
    setImages(reindexed);

    // Persist to DB for existing images
    if (auctionId) {
      const updates = reindexed
        .filter((img) => img.isExisting)
        .map((img) => ({ id: img.id, sort_order: img.sortOrder, is_primary: img.isPrimary }));
      if (updates.length > 0) {
        await auctionMediaServiceReorder(updates);
      }
    }
  };

  const emptySlots = MAX_IMAGES - images.length;

  return (
    <div>
      <label className="text-sm font-medium text-neutral-600">گالری تصاویر مزایده</label>
      <p className="text-xs text-neutral-400 mt-0.5 mb-3">
        حداکثر ۵ تصویر — تصویر اول به‌عنوان تصویر اصلی استفاده می‌شود
      </p>

      {/* Main preview */}
      <div className="w-full aspect-[16/10] rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 mb-3 relative group">
        {images.length > 0 ? (
          <>
            <img
              src={images[0].url}
              alt="تصویر اصلی مزایده"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-600 text-white text-xs font-medium">
                <Star className="w-3 h-3 fill-current" />
                اصلی
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 gap-2">
            <ImageIcon className="w-10 h-10" />
            <span className="text-sm">هنوز تصویری اضافه نشده</span>
          </div>
        )}
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-5 gap-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50"
          >
            <img src={image.url} alt="" className="w-full h-full object-cover" />

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-neutral-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {index > 0 && (
                <button
                  onClick={() => handleMove(index, 'right')}
                  className="w-7 h-7 rounded-full bg-white/90 text-neutral-700 flex items-center justify-center hover:bg-white"
                  title="انتقال به راست (جلوتر)"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {index < images.length - 1 && (
                <button
                  onClick={() => handleMove(index, 'left')}
                  className="w-7 h-7 rounded-full bg-white/90 text-neutral-700 flex items-center justify-center hover:bg-white"
                  title="انتقال به چپ (عقب‌تر)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => handleDelete(image.id)}
                className="w-7 h-7 rounded-full bg-error-500 text-white flex items-center justify-center hover:bg-error-600"
                title="حذف"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary badge */}
            {image.isPrimary && (
              <div className="absolute bottom-1 right-1">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary-600 text-white text-[10px] font-medium">
                  <Star className="w-2.5 h-2.5 fill-current" />
                </span>
              </div>
            )}

            {/* Order number */}
            <div className="absolute top-1 left-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-900/60 text-white text-[10px] font-medium">
                {index + 1}
              </span>
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.min(emptySlots, MAX_IMAGES) }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/50 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-[10px]">افزودن</span>
              </>
            )}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = '';
        }}
      />

      {uploadError && (
        <p className="text-xs text-error-600 flex items-center gap-1 mt-2">
          <AlertCircle className="w-3 h-3" /> {uploadError}
        </p>
      )}
    </div>
  );
}

// Helper to avoid circular import — calls supabase directly
async function auctionMediaServiceReorder(
  items: { id: string; sort_order: number; is_primary: boolean }[],
): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('auction_media')
      .update({ sort_order: item.sort_order, is_primary: item.is_primary })
      .eq('id', item.id);
    if (error) {
      logger.error('[AuctionGalleryManager] reorder', error);
    }
  }
}
