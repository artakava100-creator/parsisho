import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { quickAccessItems } from '@/config/home-sections';

export function QuickAccessGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {quickAccessItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.id} to={item.to} className="block group">
            <Card hover className="p-3.5 h-full relative overflow-hidden">
              <div className="flex items-start justify-between mb-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-primary-600" />
                </div>
                {item.badge && !item.comingSoon && (
                  <Badge tone="error" variant="solid" className="text-[9px] px-1.5 py-0.5">
                    {item.badge}
                  </Badge>
                )}
                {item.comingSoon && (
                  <Badge tone="neutral" variant="soft" className="text-[9px] px-1.5 py-0.5">
                    به‌زودی
                  </Badge>
                )}
              </div>
              <h3 className="text-sm font-bold text-neutral-800 mb-0.5">{item.label}</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-1">{item.description}</p>
              <ArrowLeft className="absolute bottom-3 left-3 w-3.5 h-3.5 text-neutral-300 group-hover:text-primary-500 transition-colors" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
