import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type AppStore = 'bazaar' | 'myket' | 'appstore';

interface AppStoreBadgeProps {
  store: AppStore;
  href: string;
  className?: string;
}

interface StoreConfig {
  bg: string;
  hoverBg: string;
  label: string;
  icon: ReactNode;
}

function BazaarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2C8.5 2 6 4.3 6 7.2c0 1.6.8 2.9 1.9 3.8-.2.8-.6 1.4-.6 1.4s-2.2-.3-3.2 1.2c-.8 1.1-.3 2.7.9 3.1.1.4.3.9.7 1.1 1.2.7 2.5.3 2.9-.1.4.5 1 .9 1.7.9.7 0 1.3-.4 1.7-.9.4.4 1.7.8 2.9.1.4-.2.6-.7.7-1.1 1.2-.4 1.7-2 .9-3.1-1-1.5-3.2-1.2-3.2-1.2s-.4-.6-.6-1.4C17.2 10.1 18 8.8 18 7.2 18 4.3 15.5 2 12 2Z"
        fill="currentColor"
        opacity="0.95"
      />
      <circle cx="9.5" cy="6.8" r="1.1" fill="#fff" opacity="0.85" />
      <circle cx="14.5" cy="6.8" r="1.1" fill="#fff" opacity="0.85" />
    </svg>
  );
}

function MyketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2.5c-1.6 0-2.9 1.2-2.9 2.7 0 .5.1.9.3 1.3-1.6.3-2.9 1.6-2.9 3.2 0 .6.2 1.2.5 1.7-1.3.5-2.2 1.7-2.2 3.1 0 1.9 1.6 3.4 3.6 3.4.5 0 1-.1 1.4-.3.2 1.7 1.7 3 3.6 3 1.9 0 3.4-1.3 3.6-3 .4.2.9.3 1.4.3 2 0 3.6-1.5 3.6-3.4 0-1.4-.9-2.6-2.2-3.1.3-.5.5-1.1.5-1.7 0-1.6-1.3-2.9-2.9-3.2.2-.4.3-.8.3-1.3 0-1.5-1.3-2.7-2.9-2.7Z"
        fill="currentColor"
        opacity="0.95"
      />
      <circle cx="10" cy="7.5" r="1" fill="#fff" opacity="0.85" />
      <circle cx="14" cy="7.5" r="1" fill="#fff" opacity="0.85" />
      <circle cx="12" cy="11" r="1" fill="#fff" opacity="0.85" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.7 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.3-.9-2.3-3.4ZM14.5 5.5c.6-.8 1-1.8.9-2.9-.9 0-1.9.6-2.5 1.4-.5.7-1 1.7-.9 2.7 1 .1 1.9-.5 2.5-1.2Z" />
    </svg>
  );
}

const storeConfigs: Record<AppStore, StoreConfig> = {
  bazaar: {
    bg: 'bg-[#1B7A43]',
    hoverBg: 'hover:bg-[#186D3C]',
    label: 'کافه بازار',
    icon: <BazaarIcon className="w-5 h-5 text-white shrink-0" />,
  },
  myket: {
    bg: 'bg-[#1E88E5]',
    hoverBg: 'hover:bg-[#1976D2]',
    label: 'مایکت',
    icon: <MyketIcon className="w-5 h-5 text-white shrink-0" />,
  },
  appstore: {
    bg: 'bg-[#0F172A]',
    hoverBg: 'hover:bg-[#1E293B]',
    label: 'اپ استور',
    icon: <AppleIcon className="w-5 h-5 text-white shrink-0" />,
  },
};

export function AppStoreBadge({ store, href, className }: AppStoreBadgeProps) {
  const config = storeConfigs[store];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-between h-11 px-3.5 rounded-md text-white w-full',
        'shadow-sm transition-all duration-normal ease-out',
        'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        config.bg,
        config.hoverBg,
        className,
      )}
    >
      <span className="text-sm font-bold leading-none">{config.label}</span>
      {config.icon}
    </a>
  );
}
