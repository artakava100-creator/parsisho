import { useState, useEffect, useRef } from 'react';
import { Home, Save, Loader2, Eye, EyeOff, Upload, Trash2, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/providers/useToast';
import { supabase } from '@/lib/supabase';

const SETTINGS_KEYS = [
  'homepage_intro',
  'homepage_intro_bg',
  'homepage_auction_title',
  'footer_copyright',
  'footer_social_links',
  'footer_credentials',
  'auction_hall_categories',
];

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
  enamad: CredentialItem;
  business_license: CredentialItem;
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

  const [intro, setIntro] = useState<IntroConfig>({ title: '', subtitle: '', description: '', visible: true });
  const [introBg, setIntroBg] = useState<IntroBgConfig>({ image_url: null });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auctionTitle, setAuctionTitle] = useState<AuctionTitleConfig>({ title: '' });
  const [copyright, setCopyright] = useState<CopyrightConfig>({ text: '', version: '' });
  const [social, setSocial] = useState<SocialConfig>({ links: [] });
  const [credentials, setCredentials] = useState<CredentialsConfig>({
    enamad: { image_url: '', link: '', visible: true },
    business_license: { image_url: '', link: '', visible: true },
  });
  const [hall, setHall] = useState<HallConfig>({ categories: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allSettings) return;
    if (allSettings.homepage_intro) setIntro(allSettings.homepage_intro as IntroConfig);
    if (allSettings.homepage_intro_bg) setIntroBg(allSettings.homepage_intro_bg as IntroBgConfig);
    if (allSettings.homepage_auction_title) setAuctionTitle(allSettings.homepage_auction_title as AuctionTitleConfig);
    if (allSettings.footer_copyright) setCopyright(allSettings.footer_copyright as CopyrightConfig);
    if (allSettings.footer_social_links) setSocial(allSettings.footer_social_links as SocialConfig);
    if (allSettings.footer_credentials) setCredentials(allSettings.footer_credentials as CredentialsConfig);
    if (allSettings.auction_hall_categories) setHall(allSettings.auction_hall_categories as HallConfig);
  }, [allSettings]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'homepage_intro', value: intro }),
        updateSetting.mutateAsync({ key: 'homepage_intro_bg', value: introBg }),
        updateSetting.mutateAsync({ key: 'homepage_auction_title', value: auctionTitle }),
        updateSetting.mutateAsync({ key: 'footer_copyright', value: copyright }),
        updateSetting.mutateAsync({ key: 'footer_social_links', value: social }),
        updateSetting.mutateAsync({ key: 'footer_credentials', value: credentials }),
        updateSetting.mutateAsync({ key: 'auction_hall_categories', value: hall }),
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

      {/* FOOTER COPYRIGHT */}
      <SectionCard title="حقوق و نسخه">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="متن حقوق" value={copyright.text} onChange={(v) => setCopyright((p) => ({ ...p, text: v }))} />
          <Field label="نسخه" value={copyright.version} onChange={(v) => setCopyright((p) => ({ ...p, version: v }))} />
        </div>
      </SectionCard>

      {/* SOCIAL LINKS */}
      <SectionCard title="شبکه‌های اجتماعی">
        <div className="space-y-3">
          {social.links.map((link, idx) => (
            <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <input
                value={link.title}
                onChange={(e) => {
                  const updated = [...social.links];
                  updated[idx] = { ...link, title: e.target.value };
                  setSocial({ links: updated });
                }}
                className="w-24 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                placeholder="عنوان"
              />
              <input
                value={link.url}
                onChange={(e) => {
                  const updated = [...social.links];
                  updated[idx] = { ...link, url: e.target.value };
                  setSocial({ links: updated });
                }}
                className="flex-1 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm"
                placeholder="آدرس"
                dir="ltr"
              />
              <button
                onClick={() => {
                  const updated = [...social.links];
                  updated[idx] = { ...link, visible: !link.visible };
                  setSocial({ links: updated });
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${link.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
              >
                {link.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* CREDENTIALS */}
      <SectionCard title="نمادها و مجوزها">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-700">اینماد</h4>
              <button
                onClick={() => setCredentials((p) => ({ ...p, enamad: { ...p.enamad, visible: !p.enamad.visible } }))}
                className={`w-7 h-7 rounded-lg flex items-center justify-center border text-xs ${credentials.enamad.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
              >
                {credentials.enamad.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
            <Field label="لینک تصویر" value={credentials.enamad.image_url} onChange={(v) => setCredentials((p) => ({ ...p, enamad: { ...p.enamad, image_url: v } }))} dir="ltr" />
            <Field label="لینک مقصد" value={credentials.enamad.link} onChange={(v) => setCredentials((p) => ({ ...p, enamad: { ...p.enamad, link: v } }))} dir="ltr" />
          </div>
          <div className="space-y-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-700">مجوز کسب‌وکار</h4>
              <button
                onClick={() => setCredentials((p) => ({ ...p, business_license: { ...p.business_license, visible: !p.business_license.visible } }))}
                className={`w-7 h-7 rounded-lg flex items-center justify-center border text-xs ${credentials.business_license.visible ? 'bg-success-50 border-success-300 text-success-600' : 'bg-neutral-50 border-neutral-200 text-neutral-400'}`}
              >
                {credentials.business_license.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
            <Field label="لینک تصویر" value={credentials.business_license.image_url} onChange={(v) => setCredentials((p) => ({ ...p, business_license: { ...p.business_license, image_url: v } }))} dir="ltr" />
            <Field label="لینک مقصد" value={credentials.business_license.link} onChange={(v) => setCredentials((p) => ({ ...p, business_license: { ...p.business_license, link: v } }))} dir="ltr" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
