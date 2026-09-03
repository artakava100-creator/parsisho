import { useState } from 'react';
import { Gavel, Plus, Calendar, Clock, Play, Pause, Trophy, Settings, AlertCircle } from 'lucide-react';
import { useAdminAuctions, useCreateAuction, useScheduleAuction, useGoLiveAuction, useCancelAuction, useFinalizeAuction } from '@/hooks/useAdminAuction';
import { useIranToday } from '@/hooks/useAuction';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { formatJalaliDate, formatTime } from '@/lib/jalali';
import type { Auction, AuctionStatus } from '@/types';

const STATUS_TONE: Record<AuctionStatus, { tone: 'neutral' | 'primary' | 'error' | 'success' | 'warning'; label: string }> = {
  draft: { tone: 'neutral', label: 'پیش‌نویس' },
  scheduled: { tone: 'primary', label: 'برنامه‌ریزی‌شده' },
  live: { tone: 'error', label: 'زنده' },
  ending: { tone: 'warning', label: 'در حال پایان' },
  ended: { tone: 'success', label: 'پایان‌یافته' },
  cancelled: { tone: 'neutral', label: 'لغوشده' },
};

export function AdminAuctionPage() {
  const { data: auctions, isLoading, error } = useAdminAuctions();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <FullPageSpinner />;
  if (error) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          title="خطا در بارگذاری"
          description="لطفاً دوباره تلاش کنید"
        />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">مدیریت مزایده‌ها</h1>
            <p className="text-sm text-neutral-500">ایجاد، برنامه‌ریزی و مدیریت مزایده‌ها</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          مزایده جدید
        </Button>
      </div>

      {(!auctions || auctions.length === 0) ? (
        <Card className="p-8">
          <EmptyState
            icon={<Gavel className="w-8 h-8" />}
            title="هنوز مزایده‌ای ایجاد نشده"
            description="برای شروع، اولین مزایده را ایجاد کنید"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {auctions.map((auction) => (
            <AuctionRow key={auction.id} auction={auction} />
          ))}
        </div>
      )}

      <CreateAuctionModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function AuctionRow({ auction }: { auction: Auction }) {
  const schedule = useScheduleAuction();
  const goLive = useGoLiveAuction();
  const cancel = useCancelAuction();
  const finalize = useFinalizeAuction();

  const statusInfo = STATUS_TONE[auction.status];
  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string; action: () => void } | null>(null);

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction.action();
      setConfirmAction(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-neutral-800 truncate">{auction.title}</h3>
            <Badge tone={statusInfo.tone} variant="soft">{statusInfo.label}</Badge>
            {auction.isOfficial && <Badge tone="accent" variant="outline">رسمی</Badge>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatJalaliDate(new Date(auction.auctionDate))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(new Date(auction.startsAt))} - {formatTime(new Date(auction.endsAt))}
            </span>
            <span>قیمت شروع: {formatCurrency(auction.startingPrice)}</span>
            <span>قیمت فعلی: {formatCurrency(auction.currentPrice)}</span>
            <span>کلیک‌ها: {toPersianDigits(auction.clickCount)}</span>
            {auction.originalPrice && <span>قیمت اصلی: {formatCurrency(auction.originalPrice)}</span>}
            <span>هزینه کلیک: {formatCurrency(auction.clickCost)}</span>
            {auction.extensionUsed && <span className='text-warning-600'>تمدید شده</span>}
            {auction.participantCount > 0 && <span>شرکت‌کنندگان: {toPersianDigits(auction.participantCount)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {auction.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              loading={schedule.isPending}
              onClick={() => setConfirmAction({
                type: 'schedule',
                label: 'برنامه‌ریزی این مزایده',
                action: () => schedule.mutate(auction.id),
              })}
            >
              <Settings className="w-3.5 h-3.5" />
              برنامه‌ریزی
            </Button>
          )}
          {auction.status === 'scheduled' && (
            <Button
              variant="primary"
              size="sm"
              loading={goLive.isPending}
              onClick={() => setConfirmAction({
                type: 'live',
                label: 'شروع این مزایده',
                action: () => goLive.mutate(auction.id),
              })}
            >
              <Play className="w-3.5 h-3.5" />
              شروع
            </Button>
          )}
          {(auction.status === 'draft' || auction.status === 'scheduled' || auction.status === 'live' || auction.status === 'ending') && (
            <Button
              variant="ghost"
              size="sm"
              loading={cancel.isPending}
              onClick={() => setConfirmAction({
                type: 'cancel',
                label: 'لغو این مزایده',
                action: () => cancel.mutate(auction.id),
              })}
            >
              <Pause className="w-3.5 h-3.5" />
              لغو
            </Button>
          )}
          {(auction.status === 'live' || auction.status === 'ending') && (
            <Button
              variant="ghost"
              size="sm"
              loading={finalize.isPending}
              onClick={() => setConfirmAction({
                type: 'finalize',
                label: 'پایان دادن به این مزایده',
                action: () => finalize.mutate(auction.id),
              })}
            >
              <Trophy className="w-3.5 h-3.5" />
              پایان
            </Button>
          )}
        </div>
      </div>

      <Modal open={confirmAction !== null} onClose={() => setConfirmAction(null)} size="sm">
        <div className="text-center py-2">
          <h3 className="text-lg font-bold text-neutral-800 mb-2">تأیید عملیات</h3>
          <p className="text-sm text-neutral-500 mb-1">آیا از</p>
          <p className="text-base font-bold text-primary-700 mb-1">{confirmAction?.label}</p>
          <p className="text-sm text-neutral-500 mb-6">مطمئن هستید؟</p>
          <div className="flex gap-3">
            <Button variant="primary" fullWidth onClick={handleConfirm}>بله، تأیید</Button>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>انصراف</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function CreateAuctionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAuction = useCreateAuction();
  const { data: iranToday } = useIranToday();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [auctionDate, setAuctionDate] = useState(iranToday ?? new Date().toISOString().split('T')[0]);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [minBidIncrement, setMinBidIncrement] = useState('100000');
  const [originalPrice, setOriginalPrice] = useState('');
  const [clickCost, setClickCost] = useState('100000');
  const [isOfficial, setIsOfficial] = useState(true);
  const [productName, setProductName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) { setFormError('عنوان الزامی است'); return; }
    if (!slug.trim()) { setFormError('شناسه الزامی است'); return; }
    if (!startsAt || !endsAt) { setFormError('زمان شروع و پایان الزامی است'); return; }
    if (!startingPrice || parseInt(startingPrice) <= 0) { setFormError('قیمت شروع نامعتبر است'); return; }

    try {
      await createAuction.mutateAsync({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        auctionDate,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        startingPrice: parseInt(startingPrice, 10),
        minBidIncrement: parseInt(minBidIncrement, 10) || 100000,
        isOfficial,
        productName: productName.trim() || undefined,
        originalPrice: originalPrice ? parseInt(originalPrice, 10) : undefined,
        clickIncrement: parseInt(minBidIncrement, 10) || 100000,
        clickCost: parseInt(clickCost, 10) || 100000,
      });
      setTitle(''); setSlug(''); setDescription(''); setStartingPrice(''); setProductName(''); setOriginalPrice(''); setClickCost('100000');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد مزایده';
      setFormError(msg);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="ایجاد مزایده جدید" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="عنوان مزایده"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: مزایده ساعت لوکس"
        />

        <Input
          label="شناسه (انگلیسی)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="luxury-watch-2026-09-01"
          dir="ltr"
        />

        <Input
          label="نام محصول"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="ساعت لوکس"
        />

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1.5">توضیحات</label>
          <textarea
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-100/60 border border-neutral-300 text-neutral-800 placeholder:text-neutral-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات مزایده..."
          />
        </div>

        <Input
          label="تاریخ مزایده (میلادی)"
          type="date"
          value={auctionDate}
          onChange={(e) => setAuctionDate(e.target.value)}
          dir="ltr"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="زمان شروع"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            dir="ltr"
          />
          <Input
            label="زمان پایان"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="قیمت شروع (پارسی)"
            type="number"
            inputMode="numeric"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            dir="ltr"
            placeholder="500000"
          />
          <Input
            label="قیمت اصلی کالا (پارسی)"
            type="number"
            inputMode="numeric"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            dir="ltr"
            placeholder="10000000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="افزایش قیمت هر کلیک (پارسی)"
            type="number"
            inputMode="numeric"
            value={minBidIncrement}
            onChange={(e) => setMinBidIncrement(e.target.value)}
            dir="ltr"
            placeholder="100000"
          />
          <Input
            label="هزینه هر کلیک (پارسی)"
            type="number"
            inputMode="numeric"
            value={clickCost}
            onChange={(e) => setClickCost(e.target.value)}
            dir="ltr"
            placeholder="100000"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isOfficial}
            onChange={(e) => setIsOfficial(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 bg-neutral-100 text-primary-500 focus:ring-primary-500/30"
          />
          <span className="text-sm text-neutral-600">مزایده رسمی روزانه</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" fullWidth loading={createAuction.isPending}>
            ایجاد مزایده
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </form>
    </Modal>
  );
}
