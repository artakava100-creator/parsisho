import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { BRAND_NAME, BRAND_EMAIL, BRAND_PHONE, BRAND_COPYRIGHT_YEAR } from '@/config/brand';
import { footerGroups } from '@/config/footer-links';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-100 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                <span className="text-white font-extrabold text-base leading-none">پ</span>
              </div>
              <span className="text-lg font-extrabold text-neutral-800">{BRAND_NAME}</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-[240px]">
              پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی {BRAND_NAME}
            </p>
          </div>

          {/* Link groups */}
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-bold text-neutral-700 mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-xs text-neutral-500 hover:text-primary-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-5 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-neutral-400">
            {BRAND_COPYRIGHT_YEAR} {BRAND_NAME} — تمام حقوق محفوظ است
          </p>
          <div className="flex items-center gap-4 text-neutral-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Mail className="w-3.5 h-3.5" /> {BRAND_EMAIL}
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <Phone className="w-3.5 h-3.5" /> {BRAND_PHONE}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
