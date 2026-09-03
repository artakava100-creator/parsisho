import { useState } from 'react';
import { Wallet, Plus, Edit3, Power, AlertCircle } from 'lucide-react';
import { useAdminPackages, useCreatePackage, useUpdatePackage } from '@/hooks/useAdminPackage';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatNumber, toPersianDigits } from '@/lib/persian';
import type { ParsiPackage } from '@/types';

export function AdminPackagePage() {
  const { data: packages, isLoading, error } = useAdminPackages();
  const [showCreate, setShowCreate] = useState(false);
  const [editPkg, setEditPkg] = useState<ParsiPackage | null>(null);

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
            <Wallet className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">مدیریت پکیج‌های پارسی</h1>
            <p className="text-sm text-neutral-500">ایجاد، ویرایش و مدیریت پکیج‌های شارژ</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          پکیج جدید
        </Button>
      </div>

      {(!packages || packages.length === 0) ? (
        <Card className="p-8">
          <EmptyState
            icon={<Wallet className="w-8 h-8" />}
            title="هنوز پکیجی ایجاد نشده"
            description="برای شروع، اولین پکیج پارسی را ایجاد کنید"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <PackageRow key={pkg.id} pkg={pkg} onEdit={() => setEditPkg(pkg)} />
          ))}
        </div>
      )}

      <CreatePackageModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editPkg && <EditPackageModal pkg={editPkg} onClose={() => setEditPkg(null)} />}
    </div>
  );
}

function PackageRow({ pkg, onEdit }: { pkg: ParsiPackage; onEdit: () => void }) {
  const update = useUpdatePackage();

  const toggleActive = () => {
    update.mutate({
      packageId: pkg.id,
      input: { isActive: !pkg.isActive },
    });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-neutral-800">
              {pkg.label ?? `پکیج ${formatNumber(pkg.parsiAmount)}`}
            </h3>
            <Badge tone={pkg.isActive ? 'success' : 'neutral'} variant="soft">
              {pkg.isActive ? 'فعال' : 'غیرفعال'}
            </Badge>
            {pkg.bonusAmount > 0 && (
              <Badge tone="accent" variant="outline">
                بونوس {formatNumber(pkg.bonusAmount)}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
            <span>مقدار: {formatNumber(pkg.parsiAmount)} پارسی</span>
            <span>قیمت: {formatNumber(pkg.price)} پارسی</span>
            <span>ترتیب: {toPersianDigits(pkg.sortOrder)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit3 className="w-3.5 h-3.5" />
            ویرایش
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={update.isPending}
            onClick={toggleActive}
          >
            <Power className="w-3.5 h-3.5" />
            {pkg.isActive ? 'غیرفعال' : 'فعال'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CreatePackageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePackage();
  const [parsiAmount, setParsiAmount] = useState('');
  const [price, setPrice] = useState('');
  const [bonusAmount, setBonusAmount] = useState('0');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsi = parseInt(parsiAmount, 10);
    const pr = parseInt(price, 10);
    const bonus = parseInt(bonusAmount, 10) || 0;
    const sort = parseInt(sortOrder, 10) || 0;

    if (!parsi || parsi <= 0) { setFormError('مقدار پارسی نامعتبر است'); return; }
    if (!pr || pr <= 0) { setFormError('قیمت نامعتبر است'); return; }

    try {
      await create.mutateAsync({
        parsiAmount: parsi,
        price: pr,
        bonusAmount: bonus,
        label: label.trim() || null,
        sortOrder: sort,
      });
      setParsiAmount(''); setPrice(''); setBonusAmount('0'); setLabel(''); setSortOrder('0');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد پکیج';
      setFormError(msg);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="ایجاد پکیج پارسی" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="مقدار پارسی"
            type="number"
            inputMode="numeric"
            value={parsiAmount}
            onChange={(e) => setParsiAmount(e.target.value)}
            dir="ltr"
            placeholder="100000"
          />
          <Input
            label="قیمت (پارسی)"
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            dir="ltr"
            placeholder="100000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="بونوس (پارسی)"
            type="number"
            inputMode="numeric"
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            dir="ltr"
            placeholder="0"
          />
          <Input
            label="ترتیب نمایش"
            type="number"
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            dir="ltr"
            placeholder="0"
          />
        </div>

        <Input
          label="برچسب (اختیاری)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="مثلاً: پکیج پایه"
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" fullWidth loading={create.isPending}>
            ایجاد پکیج
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditPackageModal({ pkg, onClose }: { pkg: ParsiPackage; onClose: () => void }) {
  const update = useUpdatePackage();
  const [parsiAmount, setParsiAmount] = useState(String(pkg.parsiAmount));
  const [price, setPrice] = useState(String(pkg.price));
  const [bonusAmount, setBonusAmount] = useState(String(pkg.bonusAmount));
  const [label, setLabel] = useState(pkg.label ?? '');
  const [sortOrder, setSortOrder] = useState(String(pkg.sortOrder));
  const [isActive, setIsActive] = useState(pkg.isActive);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsi = parseInt(parsiAmount, 10);
    const pr = parseInt(price, 10);
    const bonus = parseInt(bonusAmount, 10) || 0;
    const sort = parseInt(sortOrder, 10) || 0;

    if (!parsi || parsi <= 0) { setFormError('مقدار پارسی نامعتبر است'); return; }
    if (!pr || pr <= 0) { setFormError('قیمت نامعتبر است'); return; }

    try {
      await update.mutateAsync({
        packageId: pkg.id,
        input: {
          parsiAmount: parsi,
          price: pr,
          bonusAmount: bonus,
          label: label.trim() || null,
          sortOrder: sort,
          isActive,
        },
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش پکیج';
      setFormError(msg);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="ویرایش پکیج پارسی" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="مقدار پارسی"
            type="number"
            inputMode="numeric"
            value={parsiAmount}
            onChange={(e) => setParsiAmount(e.target.value)}
            dir="ltr"
          />
          <Input
            label="قیمت (پارسی)"
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="بونوس (پارسی)"
            type="number"
            inputMode="numeric"
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            dir="ltr"
          />
          <Input
            label="ترتیب نمایش"
            type="number"
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            dir="ltr"
          />
        </div>

        <Input
          label="برچسب (اختیاری)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="مثلاً: پکیج پایه"
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 bg-neutral-100 text-primary-500 focus:ring-primary-500/30"
          />
          <span className="text-sm text-neutral-600">پکیج فعال</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" fullWidth loading={update.isPending}>
            ذخیره تغییرات
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        </div>
      </form>
    </Modal>
  );
}
