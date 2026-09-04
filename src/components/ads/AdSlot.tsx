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
      <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!advertisement) {
    return (
      <div className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/60 flex flex-col items-center justify-center gap-2.5 p-4">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-neutral-300" />
        </div>
        <p className="text-xs text-neutral-400 text-center font-medium">جایگاه تبلیغاتی</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-2xl overflow-hidden border border-neutral-200/80 hover:border-primary-300 hover:shadow-md transition-all duration-normal group block"
      aria-label={advertisement.title}
    >
      <div className="relative w-full aspect-[3/4]">
        <img
          src={advertisement.imageUrl}
          alt={advertisement.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-slow"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3">
          <p className="text-xs font-semibold text-white truncate">{advertisement.title}</p>
        </div>
      </div>
    </button>
  );
}
