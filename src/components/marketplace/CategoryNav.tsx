import { cn } from '@/lib/cn';
import { Smartphone, Headphones, Watch, Monitor, Camera, Gamepad2, Cable, LayoutGrid } from 'lucide-react';
import type { ProductCategory } from '@/types';

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  'mobile-tablet': Smartphone,
  'laptop-computer': Monitor,
  'audio-visual': Headphones,
  'wearables': Watch,
  'accessories': Cable,
  'camera-imaging': Camera,
  'gaming': Gamepad2,
};

interface CategoryNavProps {
  categories: ProductCategory[] | undefined;
  activeCategory: string;
  onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeCategory, onSelect }: CategoryNavProps) {
  const items = [
    { id: 'all', name: 'همه', slug: 'all' },
    ...(categories ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {items.map((cat) => {
        const isActive = activeCategory === cat.id;
        const Icon = cat.slug === 'all' ? LayoutGrid : (CATEGORY_ICONS[cat.slug] ?? LayoutGrid);

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-white text-neutral-500 border border-neutral-200 hover:border-primary-300 hover:text-primary-700',
            )}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
