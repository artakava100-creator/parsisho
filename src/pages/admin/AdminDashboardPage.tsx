import { Link } from 'react-router-dom';
import { Gavel, Wallet, CreditCard, Settings, Gamepad2, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const adminSections = [
  {
    to: '/admin/auctions',
    title: 'مدیریت مزایده‌ها',
    description: 'ایجاد، برنامه‌ریزی و مدیریت مزایده‌ها',
    icon: Gavel,
  },
  {
    to: '/admin/packages',
    title: 'مدیریت پکیج‌های پارسی',
    description: 'ایجاد، ویرایش و مدیریت پکیج‌های شارژ',
    icon: Wallet,
  },
  {
    to: '/admin/payments',
    title: 'مدیریت پرداخت‌ها',
    description: 'مشاهده و نظارت بر سفارش‌های پرداخت',
    icon: CreditCard,
  },
  {
    to: '/admin/store-settings',
    title: 'تنظیمات فروشگاه',
    description: 'مدیریت هزینه ارسال و کارمزد پرداخت',
    icon: Settings,
  },
  {
    to: '/admin/excitement-land',
    title: 'مدیریت سرزمین هیجان',
    description: 'ایجاد و مدیریت دورهای بازی حدس بزن',
    icon: Gamepad2,
  },
  {
    to: '/admin/businesses',
    title: 'مدیریت کسب‌وکارها',
    description: 'ایجاد، ویرایش و مدیریت کسب‌وکارهای محلی',
    icon: Building2,
  },
];

export function AdminDashboardPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-800">پنل مدیریت</h1>
          <p className="text-sm text-neutral-500">مدیریت پارسیشو</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.to} to={section.to}>
              <Card className="p-6 h-full hover:border-primary-300 hover:bg-primary-500/5 transition-colors cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-800 mb-1">{section.title}</h2>
                    <p className="text-sm text-neutral-500 leading-relaxed">{section.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
