import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface BackButtonProps {
  label?: string;
  fallbackTo?: string;
  className?: string;
}

export function BackButton({ label = 'بازگشت', fallbackTo = '/', className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors',
        className,
      )}
    >
      <ArrowRight className="w-4 h-4" />
      {label}
    </button>
  );
}
