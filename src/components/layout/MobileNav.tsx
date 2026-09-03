import { NavLink } from 'react-router-dom';
import { Gavel, Store, Trophy, Gamepad2, Home } from 'lucide-react';
import { cn } from '@/lib/cn';

const bottomNavItems = [
  { to: '/', label: 'خانه', icon: Home, end: true },
  { to: '/auctions', label: 'مزایده', icon: Gavel, end: false },
  { to: '/market', label: 'بازار', icon: Store, end: false },
  { to: '/missions', label: 'ماموریت', icon: Trophy, end: false },
  { to: '/excitement', label: 'هیجان', icon: Gamepad2, end: false },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-neutral-200/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  isActive ? 'text-primary-700' : 'text-neutral-500',
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
