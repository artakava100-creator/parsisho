import { NavLink } from 'react-router-dom';
import { Gavel, Store, Trophy, Gamepad2, Home } from 'lucide-react';
import { cn } from '@/lib/cn';

const bottomNavItems = [
  { to: '/', label: 'خانه', icon: Home, end: true },
  { to: '/auctions', label: 'مزایده', icon: Gavel, end: false },
  { to: '/market', label: 'بازار', icon: Store, end: false },
  { to: '/missions', label: 'مأموریت', icon: Trophy, end: false },
  { to: '/excitement', label: 'هیجان', icon: Gamepad2, end: false },
];

export function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
      aria-label="منوی موبایل"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[52px] relative',
                  isActive
                    ? 'text-primary-700'
                    : 'text-neutral-400 active:text-neutral-600',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary-600" />
                  )}
                  <Icon
                    className={cn(
                      'transition-transform duration-200',
                      isActive ? 'w-[22px] h-[22px] scale-110' : 'w-5 h-5',
                    )}
                  />
                  <span
                    className={cn(
                      'transition-all duration-200',
                      isActive
                        ? 'text-[11px] font-bold'
                        : 'text-[10px] font-medium',
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
