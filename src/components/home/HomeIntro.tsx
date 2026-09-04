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
      {/* Persian city skyline — ~20% opacity background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
        <svg
          viewBox="0 0 1200 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYEnd meet"
        >
          {/* Ground line */}
          <rect x="0" y="240" width="1200" height="20" rx="0" fill="#CDD5DC" />

          {/* Building cluster 1 — left */}
          <rect x="30" y="130" width="38" height="110" rx="2" fill="#CDD5DC" />
          <rect x="34" y="138" width="10" height="14" rx="1" fill="#E2E7EC" />
          <rect x="54" y="138" width="10" height="14" rx="1" fill="#E2E7EC" />
          <rect x="34" y="162" width="10" height="14" rx="1" fill="#E2E7EC" />
          <rect x="54" y="162" width="10" height="14" rx="1" fill="#E2E7EC" />
          <rect x="34" y="186" width="10" height="14" rx="1" fill="#E2E7EC" />
          <rect x="54" y="186" width="10" height="14" rx="1" fill="#E2E7EC" />

          <rect x="78" y="100" width="32" height="140" rx="2" fill="#BFD9F9" />
          <rect x="82" y="108" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="98" y="108" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="82" y="128" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="98" y="128" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="82" y="148" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="98" y="148" width="8" height="12" rx="1" fill="#E8F3FC" />

          <rect x="120" y="155" width="44" height="85" rx="2" fill="#CDD5DC" />
          <rect x="126" y="162" width="12" height="10" rx="1" fill="#E2E7EC" />
          <rect x="146" y="162" width="12" height="10" rx="1" fill="#E2E7EC" />
          <rect x="126" y="182" width="12" height="10" rx="1" fill="#E2E7EC" />
          <rect x="146" y="182" width="12" height="10" rx="1" fill="#E2E7EC" />

          {/* Mosque dome 1 */}
          <ellipse cx="220" cy="120" rx="30" ry="22" fill="#FFD9A8" />
          <rect x="200" y="120" width="40" height="120" rx="2" fill="#FFD9A8" />
          <rect x="192" y="140" width="56" height="100" rx="2" fill="#FFEAB8" />
          <rect x="198" y="150" width="14" height="20" rx="7" fill="#FFF0DC" />
          <rect x="228" y="150" width="14" height="20" rx="7" fill="#FFF0DC" />
          <rect x="213" y="185" width="14" height="55" rx="2" fill="#FFF0DC" />
          {/* Minaret left */}
          <rect x="182" y="80" width="8" height="160" rx="2" fill="#FFD9A8" />
          <ellipse cx="186" cy="80" rx="6" ry="5" fill="#FFEAB8" />
          <rect x="184" y="68" width="4" height="12" rx="2" fill="#FFD9A8" />
          {/* Minaret right */}
          <rect x="250" y="85" width="8" height="155" rx="2" fill="#FFD9A8" />
          <ellipse cx="254" cy="85" rx="6" ry="5" fill="#FFEAB8" />
          <rect x="252" y="73" width="4" height="12" rx="2" fill="#FFD9A8" />

          {/* Building cluster 2 — center-left */}
          <rect x="280" y="120" width="36" height="120" rx="2" fill="#BFD9F9" />
          <rect x="284" y="128" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="304" y="128" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="284" y="150" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="304" y="150" width="8" height="12" rx="1" fill="#E8F3FC" />
          <rect x="284" y="172" width="8" height="12" rx="1" fill="#E8F3FC" />

          <rect x="326" y="90" width="28" height="150" rx="2" fill="#CDD5DC" />
          <rect x="330" y="98" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="344" y="98" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="330" y="116" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="344" y="116" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="330" y="134" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="364" y="150" width="50" height="90" rx="2" fill="#BFD9F9" />

          {/* Tower — center */}
          <rect x="440" y="55" width="24" height="185" rx="2" fill="#CDD5DC" />
          <rect x="434" y="50" width="36" height="10" rx="2" fill="#BFD9F9" />
          <rect x="448" y="25" width="8" height="25" rx="2" fill="#CDD5DC" />
          <ellipse cx="452" cy="25" rx="6" ry="5" fill="#BFD9F9" />
          <rect x="444" y="70" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="454" y="70" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="444" y="88" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="454" y="88" width="6" height="8" rx="1" fill="#E2E7EC" />

          {/* Building cluster 3 — center */}
          <rect x="484" y="135" width="46" height="105" rx="2" fill="#FFD9A8" />
          <rect x="490" y="143" width="12" height="14" rx="1" fill="#FFF0DC" />
          <rect x="512" y="143" width="12" height="14" rx="1" fill="#FFF0DC" />
          <rect x="490" y="167" width="12" height="14" rx="1" fill="#FFF0DC" />
          <rect x="512" y="167" width="12" height="14" rx="1" fill="#FFF0DC" />

          <rect x="540" y="105" width="34" height="135" rx="2" fill="#CDD5DC" />
          <rect x="544" y="113" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="562" y="113" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="544" y="131" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="562" y="131" width="8" height="10" rx="1" fill="#E2E7EC" />

          {/* Mosque dome 2 — center-right */}
          <ellipse cx="630" cy="110" rx="28" ry="20" fill="#BFD9F9" />
          <rect x="608" y="110" width="44" height="130" rx="2" fill="#BFD9F9" />
          <rect x="602" y="130" width="56" height="110" rx="2" fill="#E8F3FC" />
          <rect x="612" y="140" width="12" height="18" rx="6" fill="#F4FAFE" />
          <rect x="636" y="140" width="12" height="18" rx="6" fill="#F4FAFE" />
          <rect x="624" y="175" width="12" height="65" rx="2" fill="#F4FAFE" />
          {/* Minaret */}
          <rect x="594" y="75" width="7" height="165" rx="2" fill="#BFD9F9" />
          <ellipse cx="597.5" cy="75" rx="5.5" ry="4.5" fill="#E8F3FC" />
          <rect x="595" y="64" width="5" height="11" rx="2" fill="#BFD9F9" />

          {/* Building cluster 4 — right */}
          <rect x="680" y="140" width="40" height="100" rx="2" fill="#FFD9A8" />
          <rect x="686" y="148" width="10" height="12" rx="1" fill="#FFF0DC" />
          <rect x="704" y="148" width="10" height="12" rx="1" fill="#FFF0DC" />
          <rect x="686" y="170" width="10" height="12" rx="1" fill="#FFF0DC" />

          <rect x="730" y="95" width="30" height="145" rx="2" fill="#CDD5DC" />
          <rect x="734" y="103" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="748" y="103" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="734" y="121" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="748" y="121" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="734" y="139" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="770" y="160" width="48" height="80" rx="2" fill="#BFD9F9" />
          <rect x="776" y="168" width="12" height="10" rx="1" fill="#E8F3FC" />
          <rect x="800" y="168" width="12" height="10" rx="1" fill="#E8F3FC" />
          <rect x="776" y="188" width="12" height="10" rx="1" fill="#E8F3FC" />

          {/* Tall tower — right */}
          <rect x="840" y="60" width="22" height="180" rx="2" fill="#FFD9A8" />
          <rect x="836" y="55" width="30" height="8" rx="2" fill="#FFEAB8" />
          <rect x="847" y="32" width="8" height="23" rx="2" fill="#FFD9A8" />
          <ellipse cx="851" cy="32" rx="6" ry="4.5" fill="#FFEAB8" />

          {/* Building cluster 5 — far right */}
          <rect x="880" y="125" width="36" height="115" rx="2" fill="#CDD5DC" />
          <rect x="884" y="133" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="900" y="133" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="884" y="153" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="900" y="153" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="926" y="150" width="44" height="90" rx="2" fill="#BFD9F9" />
          <rect x="932" y="158" width="10" height="12" rx="1" fill="#E8F3FC" />
          <rect x="954" y="158" width="10" height="12" rx="1" fill="#E8F3FC" />

          <rect x="980" y="110" width="30" height="130" rx="2" fill="#CDD5DC" />
          <rect x="984" y="118" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="998" y="118" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="1020" y="145" width="38" height="95" rx="2" fill="#FFD9A8" />
          <rect x="1026" y="153" width="10" height="12" rx="1" fill="#FFF0DC" />
          <rect x="1042" y="153" width="10" height="12" rx="1" fill="#FFF0DC" />

          <rect x="1068" y="120" width="32" height="120" rx="2" fill="#BFD9F9" />
          <rect x="1072" y="128" width="8" height="10" rx="1" fill="#E8F3FC" />
          <rect x="1088" y="128" width="8" height="10" rx="1" fill="#E8F3FC" />

          <rect x="1110" y="155" width="40" height="85" rx="2" fill="#CDD5DC" />
          <rect x="1160" y="130" width="30" height="110" rx="2" fill="#FFD9A8" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            <span className="text-xs font-bold text-primary-700">{c.title}</span>
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-neutral-800 leading-relaxed max-w-2xl">
            پلتفرم <span className="text-primary-700">مزایده آنلاین</span>،{' '}
            <span className="text-accent-600">خرید مستقیم</span>، سرگرمی و{' '}
            <span className="text-local-600">اقتصاد محلی</span>
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 max-w-lg leading-relaxed">
            {c.description}
          </p>
        </div>
      </div>
    </section>
  );
}
