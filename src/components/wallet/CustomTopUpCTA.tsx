import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  onCustomTopUp: () => void;
}

export function CustomTopUpCTA({ onCustomTopUp }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        variant="accent"
        size="lg"
        onClick={onCustomTopUp}
        className="flex-1 sm:flex-none sm:min-w-[240px]"
      >
        <ArrowDownToLine className="w-5 h-5" />
        شارژ مبلغ دلخواه
      </Button>
      <Button variant="ghost" size="lg" disabled className="flex-1 sm:flex-none">
        <ArrowUpFromLine className="w-5 h-5" />
        برداشت
      </Button>
    </div>
  );
}
