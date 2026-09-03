import { useState } from 'react';
import { Store } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ProductMedia } from '@/types';

interface ProductGalleryProps {
  media: ProductMedia[] | undefined;
  productName: string;
}

export function ProductGallery({ media, productName }: ProductGalleryProps) {
  const sorted = [...(media ?? [])].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = sorted[activeIndex];

  if (!sorted.length) {
    return (
      <div className="aspect-square rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-300">
        <Store className="w-16 h-16" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="aspect-square rounded-xl bg-neutral-50 overflow-hidden border border-neutral-200/60">
        <img
          src={activeItem?.url}
          alt={activeItem?.altText ?? productName}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails (only if multiple) */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {sorted.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200',
                idx === activeIndex
                  ? 'border-primary-500 ring-1 ring-primary-300'
                  : 'border-neutral-200 hover:border-neutral-300',
              )}
            >
              <img
                src={item.url}
                alt={item.altText ?? `${productName} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
