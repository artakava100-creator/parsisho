import { BRAND_NAME } from './brand';

export interface FooterLinkGroup {
  title: string;
  links: { label: string; to: string }[];
}

export const footerGroups: FooterLinkGroup[] = [
  {
    title: `درباره ${BRAND_NAME}`,
    links: [
      { label: 'درباره ما', to: '/about' },
      { label: 'قوانین و مقررات', to: '/terms' },
      { label: 'حریم خصوصی', to: '/privacy' },
      { label: 'سوالات متداول', to: '/faq' },
    ],
  },
  {
    title: `اکوسیستم ${BRAND_NAME}`,
    links: [
      { label: 'مزایده', to: '/auctions' },
      { label: 'بازار', to: '/market' },
      { label: 'سرزمین هیجان', to: '/excitement' },
      { label: 'مأموریت‌ها', to: '/missions' },
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
  {
    title: 'لینکدونی',
    links: [
      { label: 'بلاگ', to: '/blog' },
      { label: 'همکاری در فروش', to: '/affiliate' },
      { label: 'فرصت‌های شغلی', to: '/careers' },
      { label: 'نقشه سایت', to: '/sitemap' },
    ],
  },
];
