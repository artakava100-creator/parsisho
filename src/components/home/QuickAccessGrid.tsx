import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import {
  quickAccessIconMap,
  defaultQuickAccessItems,
  type QuickAccessConfig,
  type QuickAccessConfigItem,
} from '@/config/home-sections';
import { cn } from '@/lib/cn';

function resolveItems(config: QuickAccessConfig | null): QuickAccessConfigItem[] {
  const items = config?.items?.length ? config.items : defaultQuickAccessItems;
  return items
    .filter((item) => item.active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function QuickAccessGrid() {
  const { data: config } = useSiteSetting<QuickAccessConfig>('homepage_quick_access');
  const items = resolveItems(config);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:flex sm:flex-row sm:overflow-visible">
      {items.map((item, idx) => {
        const Icon = quickAccessIconMap[item.icon] ?? quickAccessIconMap.gavel;
        return (
          <Link
            key={item.id}
            to={item.link}
            style={{ animationDelay: `${idx * 0.4}s` }}
            className={cn(
              'group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-neutral-200/80',
              'hover:border-primary-200 hover:shadow-md hover:-translate-y-0.5',
              'transition-all duration-normal',
              'sm:flex-1',
              'animate-quick-access-glow',
            )}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-50 text-primary-700 group-hover:bg-primary-100 transition-colors">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 whitespace-nowrap">
              {item.label}
            </h3>
            <ArrowLeft className="w-4 h-4 text-neutral-300 group-hover:text-primary-500 shrink-0 transition-colors hidden sm:block" />
          </Link>
        );
      })}
    </div>
  );
}
