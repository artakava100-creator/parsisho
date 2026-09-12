import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Send, MessageCircle, ShieldCheck, Award, Globe, ArrowLeft } from 'lucide-react';
import { BRAND_NAME, BRAND_EMAIL, BRAND_PHONE } from '@/config/brand';
import { footerGroups } from '@/config/footer-links';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { toPersianDigits } from '@/lib/persian';
import { useToast } from '@/providers/useToast';

interface SocialLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  visible: boolean;
}
interface FooterSocial { links: SocialLink[] }
interface FooterCopyright { text: string; version: string }
interface CredentialItem {
  image_url: string;
  link: string;
  visible: boolean;
}
interface FooterCredentials {
  badges: CredentialItem[];
}
interface NewsletterConfig {
  title: string;
  subtitle: string;
  visible: boolean;
}

const socialIconMap: Record<string, typeof Globe> = {
  eitaa: MessageCircle,
  telegram: Send,
  globe: Globe,
  website: Globe,
};

const defaultSocial: FooterSocial = {
  links: [
    { id: 'eitaa', title: 'ایتا', url: '#', icon: 'eitaa', visible: true },
    { id: 'telegram', title: 'تلگرام', url: '#', icon: 'telegram', visible: true },
    { id: 'website', title: 'وبسایت', url: '#', icon: 'globe', visible: true },
  ],
};
const defaultCopyright: FooterCopyright = {
  text: `تمامی حقوق برای تیم ${BRAND_NAME} محفوظ است`,
  version: '۴۰۵.۱',
};
const defaultCredentials: FooterCredentials = {
  badges: Array.from({ length: 6 }, () => ({ image_url: '', link: '', visible: true })),
};
const defaultNewsletter: NewsletterConfig = {
  title: 'خبرنامه پارسی شو',
  subtitle: 'جدیدترین مزایده‌ها، تخفیف‌ها و رویدادها را اول از همه دریافت کنید.',
  visible: true,
};

const badgeFallbackIcons = [ShieldCheck, Award, ShieldCheck, Award, ShieldCheck, Award];

export function Footer() {
  const { data: social } = useSiteSetting<FooterSocial>('footer_social_links', defaultSocial);
  const { data: copyright } = useSiteSetting<FooterCopyright>('footer_copyright', defaultCopyright);
  const { data: credentials } = useSiteSetting<FooterCredentials>('footer_credentials', defaultCredentials);
  const { data: newsletter } = useSiteSetting<NewsletterConfig>('footer_newsletter', defaultNewsletter);
  const updateSetting = useUpdateSiteSetting();
  const toast = useToast();

  const [email, setEmail] = useState('');

  const s = social ?? defaultSocial;
  const cr = copyright ?? defaultCopyright;
  const cred = credentials ?? defaultCredentials;
  const nl = newsletter ?? defaultNewsletter;

  const visibleBadges = cred.badges.filter((b) => b.visible);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmail('');
    toast.success('ایمیل شما در خبرنامه ثبت شد');
  };

  return (
    <footer className="border-t border-neutral-200 bg-neutral-100 mt-0">
      {/* Newsletter strip */}
      {nl.visible && (
        <div className="bg-gradient-to-br from-primary-800 to-primary-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8">
            <div className="flex flex-col lg:flex-row items-center gap-5 lg:gap-8">
              <div className="text-center lg:text-right lg:flex-1 lg:ps-2">
                <h3 className="text-base sm:text-lg font-extrabold mb-1">{nl.title}</h3>
                <p className="text-xs sm:text-sm text-primary-200 leading-relaxed max-w-md mx-auto lg:mx-0">
                  {nl.subtitle}
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="w-full lg:w-auto lg:flex-1 lg:max-w-md flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ایمیل خود را وارد کنید"
                    dir="rtl"
                    className="w-full h-11 ps-3 pe-10 rounded-xl bg-white/95 border border-white/20 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">عضویت</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main footer body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm shadow-primary-900/15">
                <span className="text-white font-extrabold text-lg leading-none">پ</span>
              </div>
              <span className="text-lg font-extrabold text-neutral-800">{BRAND_NAME}</span>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-[300px] mb-4">
              پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی {BRAND_NAME}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2.5 mb-5">
              {s.links.filter((l) => l.visible).map((link) => {
                const Icon = socialIconMap[link.icon] ?? Globe;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.title}
                    className="w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-primary-600 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              <a
                href={`tel:${BRAND_PHONE}`}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-600 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                {toPersianDigits(BRAND_PHONE)}
              </a>
              <a
                href={`mailto:${BRAND_EMAIL}`}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-600 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                {BRAND_EMAIL}
              </a>
            </div>
          </div>

          {/* Link groups */}
          {footerGroups.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h4 className="text-sm font-bold text-neutral-700 mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Trust badges */}
          <div className="lg:col-span-4">
            <h4 className="text-sm font-bold text-neutral-700 mb-3">نمادها و مجوزها</h4>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {visibleBadges.map((badge, idx) => {
                const FallbackIcon = badgeFallbackIcons[idx % badgeFallbackIcons.length];
                return (
                  <a
                    key={idx}
                    href={badge.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl border border-neutral-200 bg-white flex items-center justify-center hover:shadow-md hover:border-primary-200 transition-all overflow-hidden group"
                  >
                    {badge.image_url ? (
                      <img
                        src={badge.image_url}
                        alt={`نماد ${idx + 1}`}
                        className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <FallbackIcon className="w-6 h-6 text-neutral-300" />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400">
            <span>{cr.text}</span>
            <span className="text-neutral-300">|</span>
            <span>نسخه {cr.version}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>ساخته شده با</span>
            <ArrowLeft className="w-3 h-3 text-primary-500" />
            <span>تیم {BRAND_NAME}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
