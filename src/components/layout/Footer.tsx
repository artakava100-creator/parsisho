import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Send, MessageCircle, ShieldCheck, Award, Globe, ArrowLeft } from 'lucide-react';
import { BRAND_NAME } from '@/config/brand';
import { footerGroups as defaultFooterGroups, type FooterLinkGroup } from '@/config/footer-links';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { toPersianDigits } from '@/lib/persian';
import { useToast } from '@/providers/useToast';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';

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
interface FooterContactConfig {
  phone: string;
  email: string;
}
interface FooterBrandingConfig {
  description: string;
}
interface FooterLinksConfig {
  groups: FooterLinkGroup[];
}

const BADGE_COUNT = 4;

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
  badges: Array.from({ length: BADGE_COUNT }, () => ({ image_url: '', link: '', visible: true })),
};
const defaultNewsletter: NewsletterConfig = {
  title: 'خبرنامه پارسی شو',
  subtitle: 'جدیدترین مزایده‌ها و تخفیف‌ها را اول از همه دریافت کنید.',
  visible: true,
};
const defaultContact: FooterContactConfig = {
  phone: '09374847500',
  email: 'info@parsisho.ir',
};
const defaultBranding: FooterBrandingConfig = {
  description: `پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی ${BRAND_NAME}`,
};
const defaultLinks: FooterLinksConfig = { groups: defaultFooterGroups };

const badgeFallbackIcons = [ShieldCheck, Award, ShieldCheck, Award];

export function Footer() {
  const { data: social } = useSiteSetting<FooterSocial>('footer_social_links', defaultSocial);
  const { data: copyright } = useSiteSetting<FooterCopyright>('footer_copyright', defaultCopyright);
  const { data: credentials } = useSiteSetting<FooterCredentials>('footer_credentials', defaultCredentials);
  const { data: newsletter } = useSiteSetting<NewsletterConfig>('footer_newsletter', defaultNewsletter);
  const { data: contact } = useSiteSetting<FooterContactConfig>('footer_contact', defaultContact);
  const { data: branding } = useSiteSetting<FooterBrandingConfig>('footer_branding', defaultBranding);
  const { data: linksConfig } = useSiteSetting<FooterLinksConfig>('footer_links', defaultLinks);
  const toast = useToast();

  const [email, setEmail] = useState('');

  const s = social ?? defaultSocial;
  const cr = copyright ?? defaultCopyright;
  const nl = newsletter ?? defaultNewsletter;
  const ct = contact ?? defaultContact;
  const br = branding ?? defaultBranding;
  const groups = linksConfig?.groups ?? defaultFooterGroups;

  const credBadges: CredentialItem[] = (() => {
    if (credentials && Array.isArray(credentials.badges)) {
      const padded = [...credentials.badges];
      while (padded.length < BADGE_COUNT) padded.push({ image_url: '', link: '', visible: true });
      return padded.slice(0, BADGE_COUNT);
    }
    if (credentials && (credentials as unknown as { enamad?: CredentialItem }).enamad) {
      const legacy = credentials as unknown as { enamad?: CredentialItem; business_license?: CredentialItem };
      const migrated: CredentialItem[] = [
        legacy.enamad ?? { image_url: '', link: '', visible: true },
        legacy.business_license ?? { image_url: '', link: '', visible: true },
      ];
      while (migrated.length < BADGE_COUNT) migrated.push({ image_url: '', link: '', visible: true });
      return migrated.slice(0, BADGE_COUNT);
    }
    return defaultCredentials.badges;
  })();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmail('');
    toast.success('ایمیل شما در خبرنامه ثبت شد');
  };

  return (
    <footer className="border-t border-neutral-200 bg-neutral-100 mt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Top section: brand+newsletter on right, badges on left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-8 pb-8 border-b border-neutral-200">
          {/* Right: brand + newsletter */}
          <div className="lg:col-span-8 flex flex-col sm:flex-row gap-5">
            {/* Brand */}
            <div className="sm:w-[260px] shrink-0">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm shadow-primary-900/15">
                  <span className="text-white font-extrabold text-lg leading-none">پ</span>
                </div>
                <span className="text-lg font-extrabold text-neutral-800">{BRAND_NAME}</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                {br.description}
              </p>
              <div className="flex items-center gap-2">
                {s.links.filter((l) => l.visible).map((link) => {
                  const Icon = socialIconMap[link.icon] ?? Globe;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.title}
                      className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-primary-600 hover:border-primary-300 hover:shadow-sm transition-all"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Newsletter — compact, next to brand */}
            {nl.visible && (
              <div className="flex-1 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50/30 border border-primary-100/50 p-4 sm:p-5 flex flex-col justify-center">
                <h3 className="text-sm font-extrabold text-primary-800 mb-1">{nl.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                  {nl.subtitle}
                </p>
                <form onSubmit={handleSubscribe} className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ایمیل خود را وارد کنید"
                      dir="rtl"
                      className="w-full h-10 ps-3 pe-9 rounded-lg bg-white border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    عضویت
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Left: 4 trust badges in a horizontal row */}
          <div className="lg:col-span-4 flex flex-col">
            <h4 className="text-xs font-bold text-neutral-700 mb-2.5">نمادها و مجوزها</h4>
            <div className="grid grid-cols-4 gap-2 flex-1">
              {credBadges.map((badge, idx) => {
                const FallbackIcon = badgeFallbackIcons[idx % badgeFallbackIcons.length];
                const hasContent = badge.visible && badge.image_url;
                return (
                  <a
                    key={idx}
                    href={badge.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`aspect-square rounded-lg border bg-white flex items-center justify-center overflow-hidden transition-all ${
                      hasContent
                        ? 'border-neutral-200 hover:shadow-md hover:border-primary-200'
                        : 'border-neutral-200/70'
                    } group`}
                  >
                    {badge.image_url ? (
                      <img
                        src={badge.image_url}
                        alt={`نماد ${idx + 1}`}
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <FallbackIcon className="w-4 h-4 text-neutral-300" />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom section: link groups + download column — symmetric */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 lg:gap-6 mb-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-bold text-neutral-700 mb-2.5">{group.title}</h4>
              <ul className="space-y-1.5">
                {group.links.map((link, idx) => (
                  <li key={`${link.to}-${idx}`}>
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

          {/* Download column — same width as link columns */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col items-center lg:items-start">
            <h4 className="text-xs font-bold text-neutral-800 mb-1">دانلود اپلیکیشن پارسی شو</h4>
            <p className="text-xs text-neutral-500 mb-2.5 leading-relaxed text-center lg:text-right">
              روش سریع‌تر برای خرید و مزایده، روی گوشی شما
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[200px] lg:max-w-none">
              <AppStoreBadge store="bazaar" href="#" />
              <AppStoreBadge store="myket" href="#" />
              <AppStoreBadge store="appstore" href="#" />
            </div>
          </div>
        </div>

        {/* Bottom bar: copyright + contact */}
        <div className="border-t border-neutral-200 pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col items-center gap-3 sm:self-end">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              <span>{cr.text}</span>
              <span className="text-neutral-300 hidden sm:inline">|</span>
              <span>نسخه {cr.version}</span>
              <span className="text-neutral-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 text-primary-400" />
                تیم {BRAND_NAME}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-neutral-500">
              <a
                href={`tel:${ct.phone}`}
                className="flex items-center gap-1.5 hover:text-primary-600 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                {toPersianDigits(ct.phone)}
              </a>
              <a
                href={`mailto:${ct.email}`}
                className="flex items-center gap-1.5 hover:text-primary-600 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {ct.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
