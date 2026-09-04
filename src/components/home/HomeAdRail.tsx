import { AdSlot } from '@/components/ads/AdSlot';
import { homeAdSlotKeys } from '@/config/home-sections';

export function HomeAdRail() {
  return (
    <div className="flex flex-col gap-3">
      {homeAdSlotKeys.map((key) => (
        <AdSlot key={key} slotKey={key} device="desktop" />
      ))}
    </div>
  );
}
