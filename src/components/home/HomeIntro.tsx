import { BRAND_NAME } from '@/config/brand';
import { useSiteSetting } from '@/hooks/useSiteSettings';

interface IntroConfig {
  title: string;
  subtitle: string;
  description: string;
  visible: boolean;
}

const fallback: IntroConfig = {
  title: `سرزمین ${BRAND_NAME}`,
  subtitle: `پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی`,
  description: `در ${BRAND_NAME} با هیجان مزایده خرید کنید، از تخفیف‌های ویژه بهره‌مند شوید و از کسب‌وکارهای محلی حمایت کنید.`,
  visible: true,
};

export function HomeIntro() {
  const { data: config } = useSiteSetting<IntroConfig>('homepage_intro', fallback);
  const c = config ?? fallback;

  if (!c.visible) return null;

  return (
    <section className="relative overflow-hidden">
      {/* Subtle city skyline SVG background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]" aria-hidden="true">
        <svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
          <rect x="80" y="60" width="40" height="140" rx="2" fill="currentColor"/>
          <rect x="130" y="90" width="50" height="110" rx="2" fill="currentColor"/>
          <rect x="190" y="40" width="35" height="160" rx="2" fill="currentColor"/>
          <rect x="240" y="100" width="60" height="100" rx="2" fill="currentColor"/>
          <rect x="320" y="70" width="45" height="130" rx="2" fill="currentColor"/>
          <rect x="380" y="50" width="30" height="150" rx="2" fill="currentColor"/>
          <rect x="430" y="80" width="55" height="120" rx="2" fill="currentColor"/>
          <rect x="500" y="30" width="40" height="170" rx="2" fill="currentColor"/>
          <rect x="560" y="90" width="50" height="110" rx="2" fill="currentColor"/>
          <rect x="630" y="55" width="35" height="145" rx="2" fill="currentColor"/>
          <rect x="680" y="75" width="60" height="125" rx="2" fill="currentColor"/>
          <rect x="760" y="45" width="40" height="155" rx="2" fill="currentColor"/>
          <rect x="820" y="85" width="50" height="115" rx="2" fill="currentColor"/>
          <rect x="890" y="60" width="45" height="140" rx="2" fill="currentColor"/>
          <rect x="950" y="100" width="35" height="100" rx="2" fill="currentColor"/>
          <rect x="1010" y="40" width="55" height="160" rx="2" fill="currentColor"/>
          <rect x="1080" y="70" width="40" height="130" rx="2" fill="currentColor"/>
          <rect x="1140" y="50" width="50" height="150" rx="2" fill="currentColor"/>
          <rect x="1210" y="80" width="35" height="120" rx="2" fill="currentColor"/>
          <rect x="1270" y="55" width="60" height="145" rx="2" fill="currentColor"/>
          {/* Dome */}
          <ellipse cx="500" cy="30" rx="20" ry="12" fill="currentColor"/>
          <ellipse cx="760" cy="45" rx="18" ry="10" fill="currentColor"/>
          {/* Minarets */}
          <rect x="516" y="10" width="4" height="20" rx="2" fill="currentColor"/>
          <rect x="776" y="25" width="4" height="20" rx="2" fill="currentColor"/>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            <span className="text-xs font-bold text-primary-700">{c.title}</span>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-neutral-800 leading-relaxed max-w-2xl">
            {c.subtitle}
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 max-w-lg leading-relaxed">
            {c.description}
          </p>
        </div>
      </div>
    </section>
  );
}
