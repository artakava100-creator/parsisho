import { type ReactNode, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MediaUploaderProps {
  onUpload: (file: File) => void;
  accept?: string;
  className?: string;
  label?: string;
}

export function MediaUploader({ onUpload, accept = 'image/*', className, label = 'آپلود تصویر' }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-lg border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors"
      >
        <Upload className="w-6 h-6" />
        <span className="text-sm">{label}</span>
      </button>
    </div>
  );
}

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ src, alt, onRemove, className }: ImagePreviewProps) {
  return (
    <div className={cn('relative group rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50', className)}>
      <img src={src} alt={alt ?? ''} className="w-full h-32 object-cover" />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 left-1 w-7 h-7 rounded-full bg-neutral-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="حذف تصویر"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface MediaPickerProps {
  images: { id: string; url: string; alt?: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
  emptyState?: ReactNode;
}

export function MediaPicker({ images, selectedId, onSelect, className, emptyState }: MediaPickerProps) {
  if (images.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={cn('grid grid-cols-4 sm:grid-cols-6 gap-2', className)}>
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img.id)}
          className={cn(
            'relative rounded-lg overflow-hidden border-2 transition-colors aspect-square',
            selectedId === img.id ? 'border-primary-500' : 'border-neutral-200 hover:border-neutral-300',
          )}
        >
          <img src={img.url} alt={img.alt ?? ''} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}

export { ImageIcon };
