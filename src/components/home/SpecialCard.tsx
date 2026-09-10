import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { specialIconMap } from '@/config/home-sections';
import { cn } from '@/lib/cn';

export interface SpecialCardProps {
  title: string;
  description?: string | null;
  icon: string;
  imageUrl?: string | null;
  destinationUrl: string;
  /** When true, renders a non-interactive preview (used in admin editor) */
  preview?: boolean;
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function resolveIcon(iconKey: string): LucideIcon {
  return specialIconMap[iconKey] ?? specialIconMap.sparkles;
}

export function SpecialCard({ title, description, icon, imageUrl, destinationUrl, preview }: SpecialCardProps) {
  const Icon = resolveIcon(icon);
  const isExternal = isExternalUrl(destinationUrl);
  const hasImage = !!imageUrl;

  const cardContent = (
    <>
      {/* Visual area — fills the square, with content overlaid at bottom */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden">
        {hasImage ? (
          <>
            <img
              src={imageUrl!}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/70 via-neutral-900/20 to-neutral-900/0" />
            <div className="relative z-10 mt-auto w-full text-center">
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight line-clamp-2">
                {title}
              </h3>
              {description && (
                <p className="text-[10px] sm:text-xs text-white/80 mt-1 line-clamp-1">
                  {description}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-primary-50 text-primary-700 group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-normal">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" strokeWidth={1.75} />
            </div>
            <h3 className="text-xs sm:text-sm lg:text-base font-bold text-neutral-800 mt-2.5 sm:mt-3 text-center leading-tight line-clamp-2">
              {title}
            </h3>
            {description && (
              <p className="text-[10px] sm:text-xs text-neutral-500 mt-1 text-center line-clamp-1">
                {description}
              </p>
            )}
          </>
        )}
      </div>
      {!hasImage && (
        <div className="flex items-center justify-center pb-2 sm:pb-3">
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary-500 transition-colors" />
        </div>
      )}
    </>
  );

  const baseClasses = cn(
    'group flex flex-col aspect-square rounded-2xl overflow-hidden',
    'bg-white border border-neutral-200/80',
    'hover:bg-accent-50 hover:border-accent-200',
    'active:scale-[0.98]',
    'transition-all duration-300 ease-spring',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  );

  if (preview) {
    return (
      <div className={baseClasses} aria-hidden="true">
        {cardContent}
      </div>
    );
  }

  if (isExternal) {
    return (
      <a
        href={destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        aria-label={title}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link to={destinationUrl} className={baseClasses} aria-label={title}>
      {cardContent}
    </Link>
  );
}
