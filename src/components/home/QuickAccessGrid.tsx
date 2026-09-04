import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { quickAccessItems } from '@/config/home-sections';
import { cn } from '@/lib/cn';

const iconBgColors: Record<string, string> = {
  'auction-hall': 'bg-primary-100 text-primary-700',
  marketplace: 'bg-accent-50 text-accent-700',
  wallet: 'bg-success-50 text-success-600',
  missions: 'bg-warning-50 text-warning-600',
  excitement: 'bg-error-50 text-error-500',
  rewards: 'bg-accent-50 text-accent-600',
  businesses: 'bg-local-100 text-local-700',
  referrals: 'bg-info-50 text-info-500',
};

export function QuickAccessGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
      {quickAccessItems.map((item) => {
        const Icon = item.icon;
        const colorClass = iconBgColors[item.id] ?? 'bg-primary-50 text-primary-600';
        return (
          <Link key={item.id} to={item.to} className="block group">
            <div
              className={cn(
                'relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-neutral-200/80',
                'hover:border-primary-200 hover:shadow-md hover:-translate-y-0.5',
                'transition-all duration-normal',
                item.comingSoon && 'opacity-70',
              )}
            >
              <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0', colorClass)}>
                <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-sm font-bold text-neutral-800 truncate">{item.label}</h3>
                  {item.badge && !item.comingSoon && (
                    <Badge tone="error" variant="solid" className="text-[9px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                  {item.comingSoon && (
                    <Badge tone="neutral" variant="soft" className="text-[9px] px-1.5 py-0">
                      به‌زودی
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-neutral-500 truncate hidden sm:block">{item.description}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-neutral-300 group-hover:text-primary-500 shrink-0 transition-colors hidden sm:block" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
