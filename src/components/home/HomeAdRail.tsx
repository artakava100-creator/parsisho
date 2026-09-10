import { AdSlot } from '@/components/ads/AdSlot';
import { homeAdSlotKeys } from '@/config/home-sections';

export function HomeAdRail() {
  const slots = homeAdSlotKeys.slice(0, 2);
  return (
    <div className="flex flex-col gap-3 h-full">
      {slots.map((key) => (
        <div key={key} className="flex-1 min-h-0">
          <AdSlot slotKey={key} device="desktop" fill />
        </div>
      ))}
    </div>
  );
}
