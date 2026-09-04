import { Link } from 'react-router-dom';
import { Gavel, Wallet, CreditCard, Settings, Gamepad2, Building2, Megaphone, Store, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const marketplaceSections = [
  { to: '/admin/marketplace/auctions', title: 'مدیریت مزایده‌ها', description: 'ایجاد، برنامه‌ریزی و مدیریت مزایده‌ها', icon: Gavel },
  { to: '/admin/marketplace/engagement', title: 'مدیریت سرزمین هیجان', description: 'ایجاد و مدیریت دورهای بازی حدس بزن', icon: Gamepad2 },
  { to: '/admin/marketplace/businesses', title: 'مدیریت کسب‌وکارها', description: 'ایجاد، ویرایش و مدیریت کسب‌وکارهای محلی', icon: Building2 },
  { to: '/admin/marketplace/ads', title: 'مدیریت تبلیغات', description: 'ایجاد و مدیریت تبلیغات و موقعیت‌های تبلیغاتی', icon: Megaphone },
];

const systemSections = [
  { to: '/admin/system/packages', title: 'مدیریت پکیج‌های پارسی', description: 'ایجاد، ویرایش و مدیریت پکیج‌های شارژ', icon: Wallet },
  { to: '/admin/system/payments', title: 'مدیریت پرداخت‌ها', description: 'مشاهده و نظارت بر سفارش‌های پرداخت', icon: CreditCard },
  { to: '/admin/system/settings', title: 'تنظیمات فروشگاه', description: 'مدیریت هزینه ارسال و کارمزد پرداخت', icon: Settings },
];

export function AdminDashboardPage() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-800">پنل مدیریت</h1>
          <p className="text-sm text-neutral-500">مدیریت پارسیشو</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-bold text-neutral-700">مرکز کنترل بازار</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {marketplaceSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.to} to={section.to}>
                <Card glass={false} className="p-5 h-full hover:border-primary-300 hover:bg-primary-500/5 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-800 mb-0.5">{section.title}</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">{section.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-neutral-600" />
          <h2 className="text-sm font-bold text-neutral-700">مدیریت سیستم</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {systemSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.to} to={section.to}>
                <Card glass={false} className="p-5 h-full hover:border-primary-300 hover:bg-primary-500/5 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-800 mb-0.5">{section.title}</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">{section.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
