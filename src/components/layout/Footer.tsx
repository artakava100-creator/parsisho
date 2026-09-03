import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';

const footerSections = [
  {
    title: 'پارسیشو',
    links: [
      { label: 'درباره ما', to: '/about' },
      { label: 'قوانین و مقررات', to: '/terms' },
      { label: 'حریم خصوصی', to: '/privacy' },
      { label: 'سوالات متداول', to: '/faq' },
    ],
  },
  {
    title: 'شهر دیجیتال',
    links: [
      { label: 'مزایده', to: '/auctions' },
      { label: 'بازار', to: '/market' },
      { label: 'سرزمین هیجان', to: '/excitement' },
      { label: 'ماموریت‌ها', to: '/missions' },
    ],
  },
  {
    title: 'پشتیبانی',
    links: [
      { label: 'تماس با ما', to: '/support' },
      { label: 'راهنمای استفاده', to: '/guide' },
      { label: 'گزارش مشکل', to: '/report' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="hidden lg:block border-t border-neutral-200 bg-surface-sunken/50 mt-16">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                <span className="text-neutral-800 font-extrabold text-lg">پ</span>
              </div>
              <span className="text-xl font-extrabold text-neutral-800">پارسیشو</span>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              شهر دیجیتال پارسی — مزایده، خرید، سرگرمی و اقتصاد محلی در یک پلتفرم
            </p>
          </div>

          {/* Link sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-bold text-neutral-700 mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-neutral-500 hover:text-primary-700 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            © ۱۴۰۵ پارسیشو — تمام حقوق محفوظ است
          </p>
          <div className="flex items-center gap-4 text-neutral-500">
            <span className="flex items-center gap-1.5 text-sm">
              <Mail className="w-4 h-4" /> info@parsisho.ir
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <Phone className="w-4 h-4" /> ۰۲۱-۱۲۳۴۵۶۷۸
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
