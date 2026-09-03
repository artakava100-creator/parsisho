import { cn } from '@/lib/cn';
import type { ProductVariant } from '@/types';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  if (variants.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-600">انتخاب مدل</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                isSelected
                  ? 'bg-primary-50 border-primary-400 text-primary-700'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300 hover:text-primary-600',
              )}
            >
              {v.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
