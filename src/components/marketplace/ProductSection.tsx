import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ChevronLeft } from 'lucide-react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Product } from '@/types';

interface ProductSectionProps {
  title: string;
  icon: ReactNode;
  products: Product[] | undefined;
  isLoading: boolean;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  viewAllLink?: string;
  columns?: 2 | 3 | 4;
  skeletonCount?: number;
}

export function ProductSection({
  title,
  icon,
  products,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  viewAllLink,
  columns = 4,
  skeletonCount = 4,
}: ProductSectionProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[columns];

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            {icon}
          </div>
          <h2 className="text-lg font-bold text-neutral-800">{title}</h2>
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            مشاهده همه
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={cn('grid gap-4', gridCols)}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : !products || products.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className={cn('grid gap-4', gridCols)}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
