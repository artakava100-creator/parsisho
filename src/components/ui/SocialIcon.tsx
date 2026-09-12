import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SocialPlatform = 'instagram' | 'aparat' | 'telegram' | 'eitaa';

interface SocialIconProps {
  platform: SocialPlatform;
  className?: string;
}

interface PlatformConfig {
  label: string;
  hoverColor: string;
  icon: ReactNode;
}

function InstagramSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function AparatSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2.5c-2.6 0-5 .9-6.9 2.5C3.2 6.6 2 8.7 2 11c0 .3 0 .6.0 .9C2.8 10.5 4 9.5 5.5 9c1.2-.4 2.5-.3 3.7.2 1.0 .5 1.8 1.3 2.3 2.3.5 1 .5 2.1.0 3.1-.4 1-1.3 1.8-2.3 2.3-1.2.5-2.5.6-3.7.2-1.5-.5-2.7-1.5-3.5-2.9.0 .3.0 .6.0 .9 0 2.3 1.2 4.4 3.1 6C7 21.1 9.4 22 12 22s5-.9 6.9-2.5C20.8 18.4 22 16.3 22 14c0-.3 0-.6-.0-.9-.8 1.4-2 2.4-3.5 2.9-1.2.4-2.5.3-3.7-.2-1-.5-1.8-1.3-2.3-2.3-.5-1-.5-2.1.0-3.1.4-1 1.3-1.8 2.3-2.3 1.2-.5 2.5-.6 3.7-.2 1.5.5 2.7 1.5 3.5 2.9.0-.3.0-.6.0-.9 0-2.3-1.2-4.4-3.1-6C17 3.4 14.6 2.5 12 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TelegramSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M21.5 4.3 2.9 11.5c-.6.2-.6 1.0.0 1.3l4.6 1.4 1.7 5.3c.2.5.8.6 1.1.2l2.4-2.4 4.7 3.5c.4.3 1.0.1 1.1-.4l3.6-14.5c.2-.7-.5-1.3-1.2-1.0Z"
        fill="currentColor"
      />
      <path d="M8 13.5 17 7l-7.5 7.5L9 18l-1-4.5Z" fill="white" fillOpacity="0.3" />
    </svg>
  );
}

function EitaaSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2.5c-2.6 0-5.0 1.0-6.8 2.8S2.5 9.4 2.5 12s1.0 5.0 2.8 6.8S9.4 21.5 12 21.5s5.0-1.0 6.8-2.8S21.5 14.6 21.5 12s-1.0-5.0-2.8-6.8S14.6 2.5 12 2.5Z"
        fill="currentColor"
      />
      <path
        d="M8 8.5h5.5c1.7 0 3 1.2 3 2.8 0 1.2-.7 2.1-1.8 2.5L16.5 17h-2.2l-1.5-2.8H10V17H8V8.5Zm2 1.8v2.6h3.2c.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3H10Z"
        fill="white"
      />
    </svg>
  );
}

const platformConfigs: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    label: 'اینستاگرام',
    hoverColor: 'hover:text-[#E4405F]',
    icon: <InstagramSvg className="w-full h-full" />,
  },
  aparat: {
    label: 'آپارات',
    hoverColor: 'hover:text-[#ED1450]',
    icon: <AparatSvg className="w-full h-full" />,
  },
  telegram: {
    label: 'تلگرام',
    hoverColor: 'hover:text-[#229ED9]',
    icon: <TelegramSvg className="w-full h-full" />,
  },
  eitaa: {
    label: 'ایتا',
    hoverColor: 'hover:text-[#FC4F57]',
    icon: <EitaaSvg className="w-full h-full" />,
  },
};

export function SocialIcon({ platform, className }: SocialIconProps) {
  const config = platformConfigs[platform];
  return (
    <span className={cn('inline-flex items-center justify-center', config.hoverColor, className)}>
      {config.icon}
    </span>
  );
}

export const socialPlatformConfigs = platformConfigs;
