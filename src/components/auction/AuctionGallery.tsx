import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AuctionGalleryImage {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
  altText: string | null;
}

interface AuctionGalleryProps {
  media: AuctionGalleryImage[];
  fallbackImageUrl: string | null;
  title: string;
}

export function AuctionGallery({ media, fallbackImageUrl, title }: AuctionGalleryProps) {
  const images: AuctionGalleryImage[] = media.length > 0
    ? media
    : fallbackImageUrl
      ? [{ id: 'legacy', url: fallbackImageUrl, sortOrder: 0, isPrimary: true, altText: null }]
      : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = images[activeIndex] ?? images[0];

  if (!images.length) {
    return (
      <div className="aspect-[16/7] bg-gradient-to-br from-neutral-200 to-neutral-400 flex items-center justify-center">
        <ImageIcon className="w-12 h-12 text-neutral-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Main image */}
      <div className="aspect-[16/7] bg-gradient-to-br from-neutral-200 to-neutral-400 relative shrink-0 overflow-hidden">
        <img
          src={activeItem?.url}
          alt={activeItem?.altText ?? title}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails (only if multiple) */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-1">
          {images.map((item, idx) => (
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
                alt={item.altText ?? `${title} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
