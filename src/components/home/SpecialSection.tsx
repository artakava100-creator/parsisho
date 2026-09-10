import { Sparkles } from 'lucide-react';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { usePublishedSpecialItems } from '@/hooks/useAdminSpecial';
import { defaultSpecialSectionConfig, type SpecialSectionConfig } from '@/config/home-sections';
import { SpecialCard } from './SpecialCard';
import { Skeleton } from '@/components/ui/Skeleton';

export function SpecialSection() {
  const { data: config } = useSiteSetting<SpecialSectionConfig>(
    'homepage_special_section',
    defaultSpecialSectionConfig,
  );

  const sectionConfig = config ?? defaultSpecialSectionConfig;
  const maxVisible = sectionConfig.maxVisible ?? 6;

  const { data: items, isLoading } = usePublishedSpecialItems(maxVisible, sectionConfig.enabled);

  if (!sectionConfig.enabled) return null;
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="pt-1 sm:pt-2 pb-2 sm:pb-3 bg-white/60">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section heading — matches AuctionHall heading pattern */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-neutral-800">
              {sectionConfig.title || 'ویژه'}
            </h2>
          </div>
        </div>

        {/* Responsive grid: 6 cols desktop, 3 cols tablet, 2 cols mobile */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4">
            {Array.from({ length: maxVisible }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4">
            {items!.map((item) => (
              <SpecialCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                imageUrl={item.imageUrl}
                destinationUrl={item.destinationUrl}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
