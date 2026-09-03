import { cn } from '@/lib/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

function initials(name?: string): string {
  if (!name) return '؟';
  const parts = name.trim().split(' ');
  return parts.slice(0, 2).map((p) => p[0]).join('');
}

export function Avatar({ src, alt, name, size = 'md', ring = false, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center shrink-0',
        'bg-surface-overlay text-neutral-600 font-semibold',
        sizeStyles[size],
        ring && 'ring-2 ring-primary-500/50 ring-offset-2 ring-offset-surface',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt || name || ''} className="w-full h-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
