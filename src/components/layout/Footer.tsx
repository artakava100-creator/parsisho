import { Link } from 'react-router-dom';
import { Mail, Phone, Globe, Send, MessageCircle, ShieldCheck, Award } from 'lucide-react';
import { BRAND_NAME, BRAND_EMAIL, BRAND_PHONE, BRAND_DOMAIN } from '@/config/brand';
import { footerGroups } from '@/config/footer-links';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { toPersianDigits } from '@/lib/persian';

interface SocialLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  visible: boolean;
}
interface FooterSocial { links: SocialLink[] }
interface FooterCopyright { text: string; version: string }
interface FooterCredentials {
  enamad: { image_url: string; link: string; visible: boolean };
  business_license: { image_url: string; link: string; visible: boolean };
}

const socialIconMap: Record<string, typeof Globe> = {
  eitaa: MessageCircle,
  telegram: Send,
  globe: Globe,
  website: Globe,
};

const defaultSocial: FooterSocial = { links: [
  { id: 'eitaa', title: 'ایتا', url: '#', icon: 'eitaa', visible: true },
  { id: 'telegram', title: 'تلگرام', url: '#', icon: 'telegram', visible: true },
  { id: 'website', title: 'وبسایت', url: '#', icon: 'globe', visible: true },
]};
const defaultCopyright: FooterCopyright = { text: `تمامی حقوق برای تیم ${BRAND_NAME} محفوظ است`, version: '۴۰۵.۱' };
const defaultCredentials: FooterCredentials = {
  enamad: { image_url: '', link: '', visible: true },
  business_license: { image_url: '', link: '', visible: true },
};

export function Footer() {
  const { data: social } = useSiteSetting<FooterSocial>('footer_social_links', defaultSocial);
  const { data: copyright } = useSiteSetting<FooterCopyright>('footer_copyright', defaultCopyright);
  const { data: credentials } = useSiteSetting<FooterCredentials>('footer_credentials', defaultCredentials);

  const s = social ?? defaultSocial;
  const cr = copyright ?? defaultCopyright;
  const cred = credentials ?? defaultCredentials;

  return (
    <footer className="border-t border-neutral-200 bg-neutral-100 mt-8 sm:mt-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6 lg:gap-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                <span className="text-white font-extrabold text-base sm:text-lg leading-none">پ</span>
              </div>
              <span className="text-base sm:text-lg font-extrabold text-neutral-800">{BRAND_NAME}</span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-[280px] mb-4">
              پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی {BRAND_NAME}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-4">
              {s.links.filter(l => l.visible).map((link) => {
                const Icon = socialIconMap[link.icon] ?? Globe;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.title}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-primary-600 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            {/* Credentials */}
            <div className="flex items-center gap-2 sm:gap-3">
              {cred.enamad.visible && (
                <a
                  href={cred.enamad.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-neutral-200 bg-white flex items-center justify-center hover:shadow-sm transition-shadow overflow-hidden"
                  title="نماد اعتماد الکترونیکی"
                >
                  {cred.enamad.image_url ? (
                    <img src={cred.enamad.image_url} alt="اینماد" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-300" />
                  )}
                </a>
              )}
              {cred.business_license.visible && (
                <a
                  href={cred.business_license.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-neutral-200 bg-white flex items-center justify-center hover:shadow-sm transition-shadow overflow-hidden"
                  title="مجوز کسب‌وکار اینترنتی"
                >
                  {cred.business_license.image_url ? (
                    <img src={cred.business_license.image_url} alt="مجوز کسب‌وکار" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Award className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-300" />
                  )}
                </a>
              )}
            </div>
          </div>

          {/* Link groups */}
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs sm:text-sm font-bold text-neutral-700 mb-2 sm:mb-3">{group.title}</h4>
              <ul className="space-y-1.5 sm:space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-xs sm:text-sm text-neutral-500 hover:text-primary-600 transition-colors"
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
        <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-neutral-400">
            <span>{cr.text}</span>
            <span className="text-neutral-300">|</span>
            <span>نسخه {cr.version}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-neutral-400">
            <span className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Globe className="w-4 h-4" /> {BRAND_DOMAIN}
            </span>
            <a href={`mailto:${BRAND_EMAIL}`} className="flex items-center gap-1.5 text-xs sm:text-sm hover:text-primary-600 transition-colors">
              <Mail className="w-4 h-4" /> {BRAND_EMAIL}
            </a>
            <a href={`tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 text-xs sm:text-sm hover:text-primary-600 transition-colors">
              <Phone className="w-4 h-4" /> {toPersianDigits(BRAND_PHONE)}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
