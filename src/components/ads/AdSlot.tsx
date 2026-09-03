import { useEffect, useRef } from 'react';
import { Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useResolveAdSlot, useTrackAdEvent } from '@/hooks/useAds';

interface Props {
  slotKey: string;
  device?: string;
}

export function AdSlot({ slotKey, device = 'desktop' }: Props) {
  const { data, isLoading } = useResolveAdSlot(slotKey, device);
  const trackEvent = useTrackAdEvent();
  const impressionTracked = useRef(false);

  const advertisement = data?.advertisement ?? null;
  const slot = data?.slot ?? null;

  useEffect(() => {
    if (advertisement && slot && !impressionTracked.current) {
      impressionTracked.current = true;
      trackEvent.mutate({
        advertisementId: advertisement.id,
        adSlotId: slot.id,
        eventType: 'impression',
      });
    }
  }, [advertisement, slot, trackEvent]);

  const handleClick = () => {
    if (advertisement && slot) {
      trackEvent.mutate({
        advertisementId: advertisement.id,
        adSlotId: slot.id,
        eventType: 'click',
      });
    }
    if (advertisement?.destinationUrl) {
      window.open(advertisement.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!advertisement) {
    return (
      <div className="w-full aspect-[3/4] rounded-xl border border-dashed border-neutral-300 bg-surface-overlay/30 flex flex-col items-center justify-center gap-2 p-4">
        <Megaphone className="w-6 h-6 text-neutral-300" />
        <p className="text-[10px] text-neutral-400 text-center">جایگاه تبلیغاتی خالی</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-xl overflow-hidden border border-neutral-200 hover:border-primary-300 transition-colors group block"
      aria-label={advertisement.title}
    >
      <div className="relative w-full aspect-[3/4]">
        <img
          src={advertisement.imageUrl}
          alt={advertisement.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-slow"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-xs font-medium text-white truncate">{advertisement.title}</p>
        </div>
      </div>
    </button>
  );
}
