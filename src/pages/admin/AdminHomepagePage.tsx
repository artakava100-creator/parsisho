import { useState, useEffect, useRef } from 'react';
import { Home, Save, Loader2, Eye, EyeOff, Upload, Trash2, ImageIcon, Plus, ChevronUp, ChevronDown, X, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AdminSlideshow } from '@/components/admin/AdminSlideshow';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/providers/useToast';
import { supabase } from '@/lib/supabase';
import {
  quickAccessIconOptions,
  defaultQuickAccessItems,
  defaultSpecialSectionConfig,
  type QuickAccessConfig,
  type QuickAccessConfigItem,
  type SpecialSectionConfig,
} from '@/config/home-sections';
import { footerGroups as defaultFooterGroups, type FooterLinkGroup } from '@/config/footer-links';
import { SocialIcon, socialPlatformConfigs, type SocialPlatform } from '@/components/ui/SocialIcon';

const SETTINGS_KEYS = [
  'header_logo',
  'homepage_intro',
  'homepage_intro_bg',
  'homepage_auction_title',
  'footer_copyright',
  'footer_social_links',
  'footer_credentials',
  'footer_newsletter',
  'footer_contact',
  'footer_branding',
  'footer_links',
  'footer_app_download',
  'auction_hall_categories',
  'homepage_quick_access',
  'homepage_special_section',
  'homepage_sponsor_banners',
];

interface HeaderLogoConfig {
  image_url: string | null;
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

interface IntroConfig {
  title: string;
  subtitle: string;
  description: string;
  visible: boolean;
}

interface IntroBgConfig {
  image_url: string | null;
}

interface AuctionTitleConfig {
  title: string;
}

interface CopyrightConfig {
  text: string;
  version: string;
}

interface SocialLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  visible: boolean;
}

interface SocialConfig {
  links: SocialLink[];
}

interface CredentialItem {
  image_url: string;
  link: string;
  visible: boolean;
}

interface CredentialsConfig {
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

interface AppDownloadConfig {
  title: string;
  subtitle: string;
  visible: boolean;
  bazaar: { href: string; image_url: string };
  myket: { href: string; image_url: string };
  appstore: { href: string; image_url: string };
}

interface HallCategory {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  sort_order: number;
}

interface HallConfig {
  categories: HallCategory[];
}

interface SponsorBannerItem {
  image_url: string;
  link_url: string;
  visible: boolean;
}

interface SponsorBannerConfig {
  banners: SponsorBannerItem[];
}



function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-neutral-800 mb-4 pb-2 border-b border-neutral-100">{title}</h3>
      {children}
    </Card>
  );
}

function Field({ label, value, onChange, placeholder, dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-600">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir} />
    </div>
  );
}

export function AdminHomepagePage() {
  const { data: allSettings, isLoading } = useSiteSettings(SETTINGS_KEYS);
  const updateSetting = useUpdateSiteSetting();
  const toast = useToast();

  const [headerLogo, setHeaderLogo] = useState<HeaderLogoConfig>({ image_url: null });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [intro, setIntro] = useState<IntroConfig>({ title: '', subtitle: '', description: '', visible: true });
  const [introBg, setIntroBg] = useState<IntroBgConfig>({ image_url: null });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [auctionTitle, setAuctionTitle] = useState<AuctionTitleConfig>({ title: '' });
  const [copyright, setCopyright] = useState<CopyrightConfig>({ text: '', version: '' });
  const [social, setSocial] = useState<SocialConfig>({ links: [
    { id: 'instagram', title: 'اینستاگرام', url: '#', icon: 'instagram', visible: true },
    { id: 'aparat', title: 'آپارات', url: '#', icon: 'aparat', visible: true },
    { id: 'telegram', title: 'تلگرام', url: '#', icon: 'telegram', visible: true },
    { id: 'eitaa', title: 'ایتا', url: '#', icon: 'eitaa', visible: true },
  ] });
  const [credentials, setCredentials] = useState<CredentialsConfig>({
    badges: Array.from({ length: 4 }, () => ({ image_url: '', link: '', visible: true })),
  });
  const [newsletter, setNewsletter] = useState<NewsletterConfig>({ title: 'خبرنامه پارسی شو', subtitle: 'جدیدترین مزایده‌ها، تخفیف‌ها و رویدادها را اول از همه دریافت کنید.', visible: true });
  const [footerContact, setFooterContact] = useState<FooterContactConfig>({ phone: '09374847500', email: 'info@parsisho.ir' });
  const [footerBranding, setFooterBranding] = useState<FooterBrandingConfig>({ description: '' });
  const [footerLinks, setFooterLinks] = useState<FooterLinksConfig>({ groups: defaultFooterGroups });
  const [appDownload, setAppDownload] = useState<AppDownloadConfig>({
    title: 'دانلود اپلیکیشن پارسی شو',
    subtitle: 'روش سریع‌تر برای خرید و مزایده، روی گوشی شما',
    visible: true,
    bazaar: { href: '#', image_url: '' },
    myket: { href: '#', image_url: '' },
    appstore: { href: '#', image_url: '' },
  });
  const badgeFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const appBadgeFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [hall, setHall] = useState<HallConfig>({ categories: [] });
  const [quickAccess, setQuickAccess] = useState<QuickAccessConfig>({ items: defaultQuickAccessItems });
  const [specialSection, setSpecialSection] = useState<SpecialSectionConfig>(defaultSpecialSectionConfig);
  const [sponsorBanners, setSponsorBanners] = useState<SponsorBannerConfig>({ banners: Array.from({ length: 5 }, () => ({ image_url: '', link_url: '', visible: true })) });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allSettings) return;
    if (allSettings.header_logo) setHeaderLogo(allSettings.header_logo as HeaderLogoConfig);
    if (allSettings.homepage_intro) setIntro(allSettings.homepage_intro as IntroConfig);
    if (allSettings.homepage_intro_bg) setIntroBg(allSettings.homepage_intro_bg as IntroBgConfig);
    if (allSettings.homepage_auction_title) setAuctionTitle(allSettings.homepage_auction_title as AuctionTitleConfig);
    if (allSettings.footer_copyright) setCopyright(allSettings.footer_copyright as CopyrightConfig);
    if (allSettings.footer_social_links) setSocial(allSettings.footer_social_links as SocialConfig);
    if (allSettings.footer_credentials) {
      const raw = allSettings.footer_credentials as CredentialsConfig;
      if (raw.badges && Array.isArray(raw.badges)) {
        const padded = [...raw.badges];
        while (padded.length < 4) padded.push({ image_url: '', link: '', visible: true });
        setCredentials({ badges: padded.slice(0, 4) });
      } else {
        const legacy = raw as unknown as { enamad?: CredentialItem; business_license?: CredentialItem };
        const migrated: CredentialItem[] = [
          legacy.enamad ?? { image_url: '', link: '', visible: true },
          legacy.business_license ?? { image_url: '', link: '', visible: true },
        ];
        while (migrated.length < 4) migrated.push({ image_url: '', link: '', visible: true });
        setCredentials({ badges: migrated });
      }
    }
    if (allSettings.footer_newsletter) setNewsletter(allSettings.footer_newsletter as NewsletterConfig);
    if (allSettings.footer_contact) setFooterContact(allSettings.footer_contact as FooterContactConfig);
    if (allSettings.footer_branding) setFooterBranding(allSettings.footer_branding as FooterBrandingConfig);
    if (allSettings.footer_links) {
      const fl = allSettings.footer_links as FooterLinksConfig;
      if (fl.groups && Array.isArray(fl.groups)) setFooterLinks({ groups: fl.groups });
    }
    if (allSettings.footer_app_download) setAppDownload(allSettings.footer_app_download as AppDownloadConfig);
    if (allSettings.auction_hall_categories) setHall(allSettings.auction_hall_categories as HallConfig);
    if (allSettings.homepage_quick_access) setQuickAccess(allSettings.homepage_quick_access as QuickAccessConfig);
    if (allSettings.homepage_special_section) setSpecialSection(allSettings.homepage_special_section as SpecialSectionConfig);
    if (allSettings.homepage_sponsor_banners) setSponsorBanners(allSettings.homepage_sponsor_banners as SponsorBannerConfig);
  }, [allSettings]);

  const handleUploadLogo = async (file: File) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('فقط فرمت‌های PNG، JPEG، WebP و SVG مجاز است');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('حجم تصویر نباید بیشتر از ۲ مگابایت باشد');
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `header-logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homepage-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(fileName);
      setHeaderLogo({ image_url: pub.publicUrl });
      toast.success('لوگوی هدر آپلود شد');
    } catch {
      toast.error('خطا در آپلود لوگو');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setHeaderLogo({ image_url: null });
  };

  const handleUploadBg = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری مجاز است');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `intro-bg-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homepage-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(fileName);
      setIntroBg({ image_url: pub.publicUrl });
      toast.success('تصویر پس‌زمینه آپلود شد');
    } catch {
      toast.error('خطا در آپلود تصویر');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBg = () => {
    setIntroBg({ image_url: null });
  };

  const handleUploadBadge = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری مجاز است');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `badge-${index}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homepage-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(fileName);
      const updated = [...credentials.badges];
      updated[index] = { ...updated[index], image_url: pub.publicUrl };
      setCredentials({ badges: updated });
      toast.success(`تصویر نماد ${index + 1} آپلود شد`);
    } catch {
      toast.error('خطا در آپلود تصویر');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBadge = (index: number) => {
    const updated = [...credentials.badges];
    updated[index] = { ...updated[index], image_url: '' };
    setCredentials({ badges: updated });
  };

  const handleUploadBanner = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری مجاز است');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `sponsor-${index}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homepage-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(fileName);
      const updated = [...sponsorBanners.banners];
      updated[index] = { ...updated[index], image_url: pub.publicUrl };
      setSponsorBanners({ banners: updated });
      toast.success(`تصویر اسپانسر ${index + 1} آپلود شد`);
    } catch {
      toast.error('خطا در آپلود تصویر');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBanner = (index: number) => {
    const updated = [...sponsorBanners.banners];
    updated[index] = { ...updated[index], image_url: '' };
    setSponsorBanners({ banners: updated });
  };

  const handleUploadAppBadge = async (file: File, store: 'bazaar' | 'myket' | 'appstore') => {
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری مجاز است');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `app-badge-${store}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homepage-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(fileName);
      setAppDownload((p) => ({
        ...p,
        [store]: { ...p[store], image_url: pub.publicUrl },
      }));
      toast.success('تصویر دکمه دانلود آپلود شد');
    } catch {
      toast.error('خطا در آپلود تصویر');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAppBadge = (store: 'bazaar' | 'myket' | 'appstore') => {
    setAppDownload((p) => ({ ...p, [store]: { ...p[store], image_url: '' } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'header_logo', value: headerLogo }),
        updateSetting.mutateAsync({ key: 'homepage_intro', value: intro }),
        updateSetting.mutateAsync({ key: 'homepage_intro_bg', value: introBg }),
        updateSetting.mutateAsync({ key: 'homepage_auction_title', value: auctionTitle }),
        updateSetting.mutateAsync({ key: 'footer_copyright', value: copyright }),
        updateSetting.mutateAsync({ key: 'footer_social_links', value: social }),
        updateSetting.mutateAsync({ key: 'footer_credentials', value: credentials }),
        updateSetting.mutateAsync({ key: 'footer_newsletter', value: newsletter }),
        updateSetting.mutateAsync({ key: 'footer_contact', value: footerContact }),
        updateSetting.mutateAsync({ key: 'footer_branding', value: footerBranding }),
        updateSetting.mutateAsync({ key: 'footer_links', value: footerLinks }),
        updateSetting.mutateAsync({ key: 'footer_app_download', value: appDownload }),
        updateSetting.mutateAsync({ key: 'auction_hall_categories', value: hall }),
        updateSetting.mutateAsync({ key: 'homepage_quick_access', value: quickAccess }),
        updateSetting.mutateAsync({ key: 'homepage_special_section', value: specialSection }),
        updateSetting.mutateAsync({ key: 'homepage_sponsor_banners', value: sponsorBanners }),
      ]);
      toast.success('تنظیمات صفحه اصلی ذخیره شد');
    } catch {
      toast.error('خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="py-2 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-50 border border-accent-200 flex items-center justify-center">
            <Home className="w-5 h-5 text-accent-700" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">مدیریت صفحه اصلی</h1>
            <p className="text-sm text-neutral-500">پیکربندی بخش‌های مختلف صفحه اصلی پارسی شو</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ذخیره تغییرات
        </Button>
      </div>

      {/* HEADER LOGO */}
      <SectionCard title="لوگوی هدر">
        <p className="text-xs text-neutral-400 mb-3">
          لوگوی اصلی هدر سایت. اگر تصویری آپلود نشود، لوگوی پیش‌فرض نمایش داده می‌شود. فرمت‌های مجاز: PNG، JPEG، WebP، SVG. حداکثر حجم: ۲ مگابایت.
        </p>
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="w-32 h-16 rounded-xl border border-neutral-200 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center p-2">
            {headerLogo.image_url ? (
              <img src={headerLogo.image_url} alt="پیش‌نمایش لوگو" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-neutral-300">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[0.625rem]">لوگوی پیش‌فرض</span>
              </div>
            )}
          </div>
          {/* Upload / Remove */}
          <div className="flex flex-col gap-2 flex-1">
            <input
              ref={logoFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadLogo(file);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => logoFileRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {logoUploading ? 'در حال آپلود...' : headerLogo.image_url ? 'تغییر لوگو' : 'آپلود لوگو'}
              </Button>
              {headerLogo.image_url && (
                <Button variant="ghost" onClick={handleRemoveLogo} disabled={logoUploading}>
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* INTRO SECTION */}
      <SectionCard title="بخش معرفی">
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm font-medium text-neutral-600">نمایش</label>
            <button
              onClick={() => setIntro((p) => ({ ...p, visible: !p.visible }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${intro.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
            >
              {intro.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <Field label="عنوان" value={intro.title} onChange={(v) => setIntro((p) => ({ ...p, title: v }))} />
          <Field label="زیرعنوان" value={intro.subtitle} onChange={(v) => setIntro((p) => ({ ...p, subtitle: v }))} />
          <Field label="توضیحات" value={intro.description} onChange={(v) => setIntro((p) => ({ ...p, description: v }))} />

          {/* Background image upload */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <label className="text-sm font-medium text-neutral-600">تصویر پس‌زمینه بخش معرفی</label>
            <p className="text-xs text-neutral-400 mt-1 mb-3">
              ابعاد پیشنهادی: ۱۲۰۰×۱۸۷ پیکسل (نسبت ۴۵:۷). تصویر با حفظ نسبت ابعاد اصلی نمایش داده می‌شود.
            </p>

            {/* Preview */}
            <div className="mb-3 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
              {introBg.image_url ? (
                <img src={introBg.image_url} alt="پیش‌نمایش پس‌زمینه" className="w-full h-28 object-cover object-center" />
              ) : (
                <div className="w-full h-28 flex flex-col items-center justify-center text-neutral-300 gap-1">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">تصویر پیش‌فرض ( Skylines تهران )</span>
                </div>
              )}
            </div>

            {/* Upload / Remove buttons */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadBg(file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'در حال آپلود...' : 'آپلود تصویر'}
              </Button>
              {introBg.image_url && (
                <Button variant="ghost" onClick={handleRemoveBg} disabled={uploading}>
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* SLIDESHOW */}
      <AdminSlideshow />

      {/* AUCTION TITLE */}
      <SectionCard title="عنوان مزایده صفحه اصلی">
        <Field label="عنوان نمایشی" value={auctionTitle.title} onChange={(v) => setAuctionTitle({ title: v })} placeholder="مزایده آنلاین پارسی شو" />
      </SectionCard>

      {/* AUCTION HALL CATEGORIES */}
      <SectionCard title="دسته‌بندی‌های تالار مزایده">
        <div className="space-y-3">
          {hall.categories.map((cat, idx) => (
            <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="text-sm font-bold text-neutral-500 w-6 text-center">{idx + 1}</span>
              <input
                value={cat.label}
                onChange={(e) => {
                  const updated = [...hall.categories];
                  updated[idx] = { ...cat, label: e.target.value };
                  setHall({ categories: updated });
                }}
                className="flex-1 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
              />
              <select
                value={cat.icon}
                onChange={(e) => {
                  const updated = [...hall.categories];
                  updated[idx] = { ...cat, icon: e.target.value };
                  setHall({ categories: updated });
                }}
                className="h-9 px-2 rounded-lg border border-neutral-200 bg-white text-sm"
              >
                <option value="flame">آتش</option>
                <option value="calendar">تقویم</option>
                <option value="star">ستاره</option>
                <option value="sparkles">درخشش</option>
                <option value="gavel">چکش</option>
                <option value="clock">ساعت</option>
              </select>
              <button
                onClick={() => {
                  const updated = [...hall.categories];
                  updated[idx] = { ...cat, visible: !cat.visible };
                  setHall({ categories: updated });
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${cat.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
              >
                {cat.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* SPONSOR BANNERS */}
      <SectionCard title="بنر اسپانسرها">
        <p className="text-xs text-neutral-400 mb-3">
          ۵ جایگاه برای بنر اسپانسرها بین تالار مزایده و فوتر. فقط بنرهایی که تصویر دارند نمایش داده می‌شوند.
        </p>
        <div className="space-y-3">
          {sponsorBanners.banners.map((banner, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-neutral-600">بنر {idx + 1}</span>
                <button
                  onClick={() => {
                    const updated = [...sponsorBanners.banners];
                    updated[idx] = { ...banner, visible: !banner.visible };
                    setSponsorBanners({ banners: updated });
                  }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors flex-shrink-0 ${banner.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
                >
                  {banner.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-24 h-12 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex-shrink-0">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={`اسپانسر ${idx + 1}`} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => { bannerFileRefs.current[idx] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadBanner(file, idx);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => bannerFileRefs.current[idx]?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {banner.image_url ? 'تغییر' : 'آپلود'}
                    </Button>
                    {banner.image_url && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveBanner(idx)} disabled={uploading}>
                        <Trash2 className="w-3.5 h-3.5" /> حذف
                      </Button>
                    )}
                  </div>
                  <input
                    value={banner.link_url}
                    onChange={(e) => {
                      const updated = [...sponsorBanners.banners];
                      updated[idx] = { ...banner, link_url: e.target.value };
                      setSponsorBanners({ banners: updated });
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                    placeholder="https://link.com"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* SPECIAL SECTION (ویژه) */}
      <SectionCard title="بخش ویژه">
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm font-medium text-neutral-600">نمایش بخش</label>
            <button
              onClick={() => setSpecialSection((p) => ({ ...p, enabled: !p.enabled }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${specialSection.enabled ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
            >
              {specialSection.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <Field label="عنوان بخش" value={specialSection.title} onChange={(v) => setSpecialSection((p) => ({ ...p, title: v }))} placeholder="ویژه" />
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-600">حداکثر آیتم‌های نمایشی</label>
            <Input
              type="number"
              value={specialSection.maxVisible}
              onChange={(e) => setSpecialSection((p) => ({ ...p, maxVisible: parseInt(e.target.value) || 6 }))}
            />
          </div>
          <p className="text-xs text-neutral-400">
            مدیریت آیتم‌های این بخش در صفحه «مدیریت ویژه» انجام می‌شود.
          </p>
        </div>
      </SectionCard>

      {/* QUICK ACCESS STRIP */}
      <SectionCard title="دسترسی سریع صفحه اصلی">
        <p className="text-xs text-neutral-400 mb-3">
          مدیریت آیتم‌های نوار دسترسی سریع زیر اسلایدر. ترتیب نمایش بر اساس شماره ردیف است.
        </p>
        <div className="space-y-3">
          {quickAccess.items
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <span className="text-sm font-bold text-neutral-500 w-6 text-center">{idx + 1}</span>
                <input
                  value={item.label}
                  onChange={(e) => {
                    const updated = [...quickAccess.items];
                    const i = updated.findIndex((q) => q.id === item.id);
                    updated[i] = { ...item, label: e.target.value };
                    setQuickAccess({ items: updated });
                  }}
                  className="flex-1 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                  placeholder="عنوان"
                />
                <input
                  value={item.link}
                  onChange={(e) => {
                    const updated = [...quickAccess.items];
                    const i = updated.findIndex((q) => q.id === item.id);
                    updated[i] = { ...item, link: e.target.value };
                    setQuickAccess({ items: updated });
                  }}
                  className="w-32 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                  placeholder="/مسیر"
                  dir="ltr"
                />
                <select
                  value={item.icon}
                  onChange={(e) => {
                    const updated = [...quickAccess.items];
                    const i = updated.findIndex((q) => q.id === item.id);
                    updated[i] = { ...item, icon: e.target.value };
                    setQuickAccess({ items: updated });
                  }}
                  className="h-9 px-2 rounded-lg border border-neutral-200 bg-white text-sm"
                >
                  {quickAccessIconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const updated = [...quickAccess.items];
                    const i = updated.findIndex((q) => q.id === item.id);
                    updated[i] = { ...item, active: !item.active };
                    setQuickAccess({ items: updated });
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${item.active ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
                >
                  {item.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
        </div>
      </SectionCard>

      {/* FOOTER COPYRIGHT */}
      <SectionCard title="حقوق و نسخه">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="متن حقوق" value={copyright.text} onChange={(v) => setCopyright((p) => ({ ...p, text: v }))} />
          <Field label="نسخه" value={copyright.version} onChange={(v) => setCopyright((p) => ({ ...p, version: v }))} />
        </div>
      </SectionCard>

      {/* SOCIAL LINKS */}
      <SectionCard title="مدیریت فوتر — شبکه‌های اجتماعی">
        <p className="text-xs text-neutral-400 mb-4">
          ۴ شبکه اجتماعی فوتر را مدیریت کنید. لینک هر شبکه را وارد کنید، ترتیب نمایش را تغییر دهید و فعال/غیرفعال بودن هر مورد را کنترل کنید.
        </p>
        <div className="space-y-3">
          {social.links.map((link, idx) => {
            const platform = socialPlatformConfigs[link.icon as SocialPlatform];
            const isUrlValid = !link.url || link.url === '#' || /^https?:\/\/.+/.test(link.url);
            return (
              <div key={link.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  {/* Icon preview */}
                  <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                    {platform ? (
                      <SocialIcon platform={link.icon as SocialPlatform} className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <Globe className="w-4 h-4 text-neutral-300" />
                    )}
                  </div>

                  {/* Title (read-only for known platforms) */}
                  <span className="text-sm font-bold text-neutral-700 w-20 shrink-0">
                    {platform?.label ?? link.title}
                  </span>

                  {/* URL input */}
                  <div className="flex-1">
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const updated = [...social.links];
                        updated[idx] = { ...link, url: e.target.value };
                        setSocial({ links: updated });
                      }}
                      className={`w-full h-9 px-3 rounded-lg border bg-white text-sm ${isUrlValid ? 'border-neutral-200' : 'border-error-300'} focus:outline-none focus:ring-2 focus:ring-primary-200`}
                      placeholder="https://instagram.com/parsisho"
                      dir="ltr"
                    />
                    {!isUrlValid && (
                      <p className="text-xs text-error-500 mt-1">آدرس باید با http:// یا https:// شروع شود</p>
                    )}
                  </div>

                  {/* Reorder buttons */}
                  <button
                    onClick={() => {
                      if (idx > 0) {
                        const updated = [...social.links];
                        [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                        setSocial({ links: updated });
                      }
                    }}
                    disabled={idx === 0}
                    className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-primary-600 disabled:opacity-30 transition-colors shrink-0"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (idx < social.links.length - 1) {
                        const updated = [...social.links];
                        [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
                        setSocial({ links: updated });
                      }
                    }}
                    disabled={idx === social.links.length - 1}
                    className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-primary-600 disabled:opacity-30 transition-colors shrink-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => {
                      const updated = [...social.links];
                      updated[idx] = { ...link, visible: !link.visible };
                      setSocial({ links: updated });
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${link.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
                  >
                    {link.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ===== FOOTER MANAGEMENT ===== */}

      {/* FOOTER BRANDING */}
      <SectionCard title="مدیریت فوتر — برند و توضیحات">
        <div className="space-y-3">
          <Field label="توضیحات فوتر" value={footerBranding.description} onChange={(v) => setFooterBranding({ description: v })} placeholder="پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی پارسی شو" />
        </div>
      </SectionCard>

      {/* FOOTER LINK GROUPS */}
      <SectionCard title="مدیریت فوتر — دسته‌بندی لینک‌ها">
        <div className="space-y-4">
          {footerLinks.groups.map((group, gIdx) => (
            <div key={gIdx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={group.title}
                  onChange={(e) => {
                    const updated = [...footerLinks.groups];
                    updated[gIdx] = { ...group, title: e.target.value };
                    setFooterLinks({ groups: updated });
                  }}
                  className="flex-1 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm font-bold"
                  placeholder="عنوان دسته"
                />
                <button
                  onClick={() => {
                    const updated = [...footerLinks.groups];
                    if (gIdx > 0) {
                      [updated[gIdx - 1], updated[gIdx]] = [updated[gIdx], updated[gIdx - 1]];
                      setFooterLinks({ groups: updated });
                    }
                  }}
                  disabled={gIdx === 0}
                  className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-primary-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const updated = [...footerLinks.groups];
                    if (gIdx < updated.length - 1) {
                      [updated[gIdx + 1], updated[gIdx]] = [updated[gIdx], updated[gIdx + 1]];
                      setFooterLinks({ groups: updated });
                    }
                  }}
                  disabled={gIdx === footerLinks.groups.length - 1}
                  className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-primary-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const updated = footerLinks.groups.filter((_, i) => i !== gIdx);
                    setFooterLinks({ groups: updated });
                  }}
                  className="w-8 h-8 rounded-lg border border-error-200 bg-error-50 flex items-center justify-center text-error-500 hover:bg-error-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {group.links.map((link, lIdx) => (
                  <div key={lIdx} className="flex items-center gap-2">
                    <input
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...footerLinks.groups];
                        const newLinks = [...group.links];
                        newLinks[lIdx] = { ...link, label: e.target.value };
                        updated[gIdx] = { ...group, links: newLinks };
                        setFooterLinks({ groups: updated });
                      }}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs"
                      placeholder="عنوان لینک"
                    />
                    <input
                      value={link.to}
                      onChange={(e) => {
                        const updated = [...footerLinks.groups];
                        const newLinks = [...group.links];
                        newLinks[lIdx] = { ...link, to: e.target.value };
                        updated[gIdx] = { ...group, links: newLinks };
                        setFooterLinks({ groups: updated });
                      }}
                      className="w-28 h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs"
                      placeholder="/مسیر"
                      dir="ltr"
                    />
                    <button
                      onClick={() => {
                        const updated = [...footerLinks.groups];
                        const newLinks = group.links.filter((_, i) => i !== lIdx);
                        updated[gIdx] = { ...group, links: newLinks };
                        setFooterLinks({ groups: updated });
                      }}
                      className="w-7 h-7 rounded border border-neutral-200 bg-white flex items-center justify-center text-neutral-400 hover:text-error-500 transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...footerLinks.groups];
                    updated[gIdx] = { ...group, links: [...group.links, { label: '', to: '/' }] };
                    setFooterLinks({ groups: updated });
                  }}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  افزودن لینک
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setFooterLinks({
                groups: [...footerLinks.groups, { title: '', links: [{ label: '', to: '/' }] }],
              });
            }}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-bold"
          >
            <Plus className="w-4 h-4" />
            افزودن دسته‌بندی
          </button>
        </div>
      </SectionCard>

      {/* FOOTER CONTACT */}
      <SectionCard title="مدیریت فوتر — اطلاعات تماس">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="شماره تماس" value={footerContact.phone} onChange={(v) => setFooterContact((p) => ({ ...p, phone: v }))} placeholder="09374847500" dir="ltr" />
          <Field label="ایمیل" value={footerContact.email} onChange={(v) => setFooterContact((p) => ({ ...p, email: v }))} placeholder="info@parsisho.ir" dir="ltr" />
        </div>
      </SectionCard>

      {/* APP DOWNLOAD BADGES */}
      <SectionCard title="مدیریت فوتر — دکمه‌های دانلود اپلیکیشن">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm font-medium text-neutral-600">نمایش بخش</label>
            <button
              onClick={() => setAppDownload((p) => ({ ...p, visible: !p.visible }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${appDownload.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
            >
              {appDownload.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <Field label="عنوان" value={appDownload.title} onChange={(v) => setAppDownload((p) => ({ ...p, title: v }))} placeholder="دانلود اپلیکیشن پارسی شو" />
          <Field label="زیرعنوان" value={appDownload.subtitle} onChange={(v) => setAppDownload((p) => ({ ...p, subtitle: v }))} placeholder="روش سریع‌تر برای خرید و مزایده، روی گوشی شما" />

          <div className="pt-3 border-t border-neutral-100 space-y-4">
            <p className="text-xs text-neutral-400">
              برای هر فروشگاه می‌توانید تصویر دکمه دلخواه را آپلود کنید. اگر تصویری آپلود نشود، دکمه پیش‌فرض با رنگ و آیکون رسمی نمایش داده می‌شود.
            </p>
            {([
              { key: 'bazaar' as const, label: 'کافه بازار', color: '#1B7A43' },
              { key: 'myket' as const, label: 'مایکت', color: '#1E88E5' },
              { key: 'appstore' as const, label: 'اپ استور', color: '#0F172A' },
            ]).map(({ key, label, color }) => (
              <div key={key} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm font-bold text-neutral-700">{label}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-28 h-9 rounded-md border border-neutral-200 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                    {appDownload[key].image_url ? (
                      <img src={appDownload[key].image_url} alt={label} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[0.625rem] text-neutral-300">بدون تصویر</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        ref={(el) => { appBadgeFileRefs.current[key === 'bazaar' ? 0 : key === 'myket' ? 1 : 2] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAppBadge(file, key);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => appBadgeFileRefs.current[key === 'bazaar' ? 0 : key === 'myket' ? 1 : 2]?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {appDownload[key].image_url ? 'تغییر' : 'آپلود'}
                      </Button>
                      {appDownload[key].image_url && (
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAppBadge(key)} disabled={uploading}>
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </Button>
                      )}
                    </div>
                    <input
                      value={appDownload[key].href}
                      onChange={(e) => setAppDownload((p) => ({ ...p, [key]: { ...p[key], href: e.target.value } }))}
                      className="w-full h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                      placeholder="https://link.com"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* FOOTER NEWSLETTER */}
      <SectionCard title="مدیریت فوتر — خبرنامه">
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm font-medium text-neutral-600">نمایش</label>
            <button
              onClick={() => setNewsletter((p) => ({ ...p, visible: !p.visible }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${newsletter.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
            >
              {newsletter.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <Field label="عنوان" value={newsletter.title} onChange={(v) => setNewsletter((p) => ({ ...p, title: v }))} placeholder="خبرنامه پارسی شو" />
          <Field label="توضیحات" value={newsletter.subtitle} onChange={(v) => setNewsletter((p) => ({ ...p, subtitle: v }))} placeholder="جدیدترین مزایده‌ها و تخفیف‌ها..." />
        </div>
      </SectionCard>

      {/* CREDENTIALS */}
      <SectionCard title="نمادها و مجوزها">
        <p className="text-xs text-neutral-400 mb-3">۴ جایگاه برای نمادها و مجوزهای فوتر. فقط نمادهایی که تصویر دارند و فعال هستند نمایش داده می‌شوند.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {credentials.badges.map((badge, idx) => (
            <div key={idx} className="space-y-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-700">نماد {idx + 1}</h4>
                <button
                  onClick={() => {
                    const updated = [...credentials.badges];
                    updated[idx] = { ...badge, visible: !badge.visible };
                    setCredentials({ badges: updated });
                  }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border text-xs transition-colors ${badge.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
                >
                  {badge.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-lg border border-neutral-200 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                  {badge.image_url ? (
                    <img src={badge.image_url} alt={`نماد ${idx + 1}`} className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-neutral-300" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <input
                    ref={(el) => { badgeFileRefs.current[idx] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadBadge(file, idx);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => badgeFileRefs.current[idx]?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {badge.image_url ? 'تغییر' : 'آپلود'}
                    </Button>
                    {badge.image_url && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveBadge(idx)} disabled={uploading}>
                        <Trash2 className="w-3.5 h-3.5" /> حذف
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <input
                value={badge.link}
                onChange={(e) => {
                  const updated = [...credentials.badges];
                  updated[idx] = { ...badge, link: e.target.value };
                  setCredentials({ badges: updated });
                }}
                className="w-full h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                placeholder="لینک مقصد"
                dir="ltr"
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
