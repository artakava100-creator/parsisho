import { BRAND_NAME } from '@/config/brand';
import { useSiteSetting } from '@/hooks/useSiteSettings';

interface IntroConfig {
  title: string;
  subtitle: string;
  description: string;
  visible: boolean;
}

interface IntroBgConfig {
  image_url: string | null;
}

const fallback: IntroConfig = {
  title: `سرزمین ${BRAND_NAME}`,
  subtitle: `پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی`,
  description: `در ${BRAND_NAME} با هیجان مزایده خرید کنید، از تخفیف‌های ویژه بهره‌مند شوید و از کسب‌وکارهای محلی حمایت کنید.`,
  visible: true,
};

export function HomeIntro() {
  const { data: config } = useSiteSetting<IntroConfig>('homepage_intro', fallback);
  const { data: bgConfig } = useSiteSetting<IntroBgConfig>('homepage_intro_bg', { image_url: null });
  const c = config ?? fallback;
  const bgUrl = bgConfig?.image_url ?? null;

  if (!c.visible) return null;

  return (
    <section className="relative overflow-hidden min-h-[147px] sm:min-h-[173px]">
      {/* Custom background image OR Tehran skyline SVG fallback */}
      {bgUrl ? (
        <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
          <img
            src={bgUrl}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
          <svg
          viewBox="0 0 1200 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYMax meet"
        >
          {/* === Alborz mountain range (background) === */}
          <path
            d="M0,190 L60,150 L100,170 L160,115 L200,145 L250,95 L290,130 L340,88 L380,125 L420,102 L470,135 L510,85 L560,118 L600,95 L640,128 L680,105 L720,138 L760,90 L800,122 L840,100 L880,132 L920,95 L960,125 L1000,105 L1050,138 L1100,110 L1150,142 L1200,120 L1200,280 L0,280 Z"
            fill="#9AAEC4"
            opacity="0.5"
          />
          {/* Snow caps */}
          <path d="M152,125 L160,115 L168,125 L163,130 L160,120 L157,130 Z" fill="#E8F0FA" opacity="0.7" />
          <path d="M242,105 L250,95 L258,105 L253,110 L250,100 L247,110 Z" fill="#E8F0FA" opacity="0.7" />
          <path d="M332,98 L340,88 L348,98 L343,103 L340,93 L337,103 Z" fill="#E8F0FA" opacity="0.7" />
          <path d="M502,95 L510,85 L518,95 L513,100 L510,90 L507,100 Z" fill="#E8F0FA" opacity="0.7" />
          <path d="M752,100 L760,90 L768,100 L763,105 L760,95 L757,105 Z" fill="#E8F0FA" opacity="0.7" />
          <path d="M912,105 L920,95 L928,105 L923,110 L920,100 L917,110 Z" fill="#E8F0FA" opacity="0.7" />

          {/* Ground */}
          <rect x="0" y="258" width="1200" height="22" fill="#BFC8D2" />

          {/* === Azadi Tower (left, ~x=255) === */}
          <path
            fillRule="evenodd"
            d="M 218,258 L 294,258 L 280,200 L 268,140 L 258,80 L 252,52 L 246,80 L 236,140 L 224,200 Z M 240,258 L 240,225 Q 250,208 260,225 L 260,258 Z"
            fill="#D5DDE5"
          />
          <rect x="250" y="44" width="4" height="10" rx="1" fill="#BFC8D2" />

          {/* === Building cluster 1 (far left) === */}
          <rect x="30" y="160" width="34" height="98" rx="2" fill="#BFC8D2" />
          <rect x="34" y="168" width="10" height="12" rx="1" fill="#E2E7EC" />
          <rect x="52" y="168" width="10" height="12" rx="1" fill="#E2E7EC" />
          <rect x="34" y="188" width="10" height="12" rx="1" fill="#E2E7EC" />
          <rect x="52" y="188" width="10" height="12" rx="1" fill="#E2E7EC" />
          <rect x="34" y="208" width="10" height="12" rx="1" fill="#E2E7EC" />
          <rect x="52" y="208" width="10" height="12" rx="1" fill="#E2E7EC" />

          <rect x="74" y="128" width="28" height="130" rx="2" fill="#A5C2E0" />
          <rect x="78" y="136" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="92" y="136" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="78" y="154" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="92" y="154" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="78" y="172" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="92" y="172" width="8" height="10" rx="1" fill="#D8EBF8" />

          <rect x="112" y="170" width="44" height="88" rx="2" fill="#D5DDE5" />
          <rect x="118" y="178" width="12" height="10" rx="1" fill="#E2E7EC" />
          <rect x="138" y="178" width="12" height="10" rx="1" fill="#E2E7EC" />
          <rect x="118" y="198" width="12" height="10" rx="1" fill="#E2E7EC" />
          <rect x="138" y="198" width="12" height="10" rx="1" fill="#E2E7EC" />

          {/* === Buildings between Azadi and Milad === */}
          <rect x="330" y="142" width="38" height="116" rx="2" fill="#A5C2E0" />
          <rect x="334" y="150" width="10" height="12" rx="1" fill="#D8EBF8" />
          <rect x="354" y="150" width="10" height="12" rx="1" fill="#D8EBF8" />
          <rect x="334" y="172" width="10" height="12" rx="1" fill="#D8EBF8" />
          <rect x="354" y="172" width="10" height="12" rx="1" fill="#D8EBF8" />
          <rect x="334" y="194" width="10" height="12" rx="1" fill="#D8EBF8" />
          <rect x="354" y="194" width="10" height="12" rx="1" fill="#D8EBF8" />

          <rect x="378" y="112" width="26" height="146" rx="2" fill="#D5DDE5" />
          <rect x="382" y="120" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="396" y="120" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="382" y="138" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="396" y="138" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="382" y="156" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="396" y="156" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="416" y="162" width="50" height="96" rx="2" fill="#E8B888" />
          <rect x="422" y="170" width="12" height="10" rx="1" fill="#FFE0C0" />
          <rect x="444" y="170" width="12" height="10" rx="1" fill="#FFE0C0" />
          <rect x="422" y="190" width="12" height="10" rx="1" fill="#FFE0C0" />
          <rect x="444" y="190" width="12" height="10" rx="1" fill="#FFE0C0" />

          {/* === Milad Tower (center, ~x=560) === */}
          {/* Base */}
          <rect x="548" y="215" width="24" height="43" rx="2" fill="#D5DDE5" />
          {/* Main shaft */}
          <rect x="553" y="72" width="14" height="143" fill="#A5C2E0" />
          {/* Observation pod (characteristic bulb) */}
          <rect x="540" y="45" width="40" height="27" rx="6" fill="#7BA8D5" />
          <rect x="544" y="51" width="32" height="16" rx="3" fill="#D0E6F7" />
          {/* Upper section */}
          <rect x="555" y="25" width="10" height="20" fill="#A5C2E0" />
          {/* Spire/antenna */}
          <rect x="558" y="5" width="4" height="20" fill="#BFC8D2" />
          <circle cx="560" cy="5" r="3" fill="#7BA8D5" />
          {/* Shaft windows */}
          <rect x="556" y="92" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="92" width="3" height="6" fill="#D8EBF8" />
          <rect x="556" y="107" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="107" width="3" height="6" fill="#D8EBF8" />
          <rect x="556" y="122" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="122" width="3" height="6" fill="#D8EBF8" />
          <rect x="556" y="137" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="137" width="3" height="6" fill="#D8EBF8" />
          <rect x="556" y="152" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="152" width="3" height="6" fill="#D8EBF8" />
          <rect x="556" y="167" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="167" width="3" height="6" fill="#D8EBF8" />
          <rect x="556" y="182" width="3" height="6" fill="#D8EBF8" />
          <rect x="561" y="182" width="3" height="6" fill="#D8EBF8" />

          {/* === Buildings right of Milad === */}
          <rect x="620" y="132" width="36" height="126" rx="2" fill="#D5DDE5" />
          <rect x="624" y="140" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="640" y="140" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="624" y="158" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="640" y="158" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="624" y="176" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="640" y="176" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="668" y="102" width="30" height="156" rx="2" fill="#A5C2E0" />
          <rect x="672" y="110" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="686" y="110" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="672" y="128" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="686" y="128" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="672" y="146" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="686" y="146" width="8" height="10" rx="1" fill="#D8EBF8" />

          <rect x="710" y="158" width="44" height="100" rx="2" fill="#E8B888" />
          <rect x="716" y="166" width="12" height="10" rx="1" fill="#FFE0C0" />
          <rect x="736" y="166" width="12" height="10" rx="1" fill="#FFE0C0" />
          <rect x="716" y="186" width="12" height="10" rx="1" fill="#FFE0C0" />
          <rect x="736" y="186" width="12" height="10" rx="1" fill="#FFE0C0" />

          {/* === Tall tower (right) === */}
          <rect x="780" y="62" width="22" height="196" rx="2" fill="#D5DDE5" />
          <rect x="776" y="57" width="30" height="8" rx="2" fill="#A5C2E0" />
          <rect x="786" y="37" width="10" height="20" rx="2" fill="#D5DDE5" />
          <ellipse cx="791" cy="37" rx="6" ry="4" fill="#A5C2E0" />
          <rect x="784" y="77" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="794" y="77" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="784" y="95" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="794" y="95" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="784" y="113" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="794" y="113" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="784" y="131" width="6" height="8" rx="1" fill="#E2E7EC" />
          <rect x="794" y="131" width="6" height="8" rx="1" fill="#E2E7EC" />

          {/* === Building cluster far right === */}
          <rect x="830" y="142" width="36" height="116" rx="2" fill="#A5C2E0" />
          <rect x="834" y="150" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="850" y="150" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="834" y="170" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="850" y="170" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="834" y="190" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="850" y="190" width="8" height="10" rx="1" fill="#D8EBF8" />

          <rect x="876" y="118" width="30" height="140" rx="2" fill="#D5DDE5" />
          <rect x="880" y="126" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="894" y="126" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="880" y="144" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="894" y="144" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="880" y="162" width="8" height="10" rx="1" fill="#E2E7EC" />
          <rect x="894" y="162" width="8" height="10" rx="1" fill="#E2E7EC" />

          <rect x="916" y="153" width="44" height="105" rx="2" fill="#E8B888" />
          <rect x="922" y="161" width="10" height="12" rx="1" fill="#FFE0C0" />
          <rect x="942" y="161" width="10" height="12" rx="1" fill="#FFE0C0" />
          <rect x="922" y="183" width="10" height="12" rx="1" fill="#FFE0C0" />
          <rect x="942" y="183" width="10" height="12" rx="1" fill="#FFE0C0" />

          <rect x="970" y="128" width="32" height="130" rx="2" fill="#A5C2E0" />
          <rect x="974" y="136" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="990" y="136" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="974" y="156" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="990" y="156" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="974" y="176" width="8" height="10" rx="1" fill="#D8EBF8" />
          <rect x="990" y="176" width="8" height="10" rx="1" fill="#D8EBF8" />

          <rect x="1010" y="158" width="40" height="100" rx="2" fill="#D5DDE5" />
          <rect x="1060" y="138" width="30" height="120" rx="2" fill="#E8B888" />
          <rect x="1100" y="148" width="36" height="110" rx="2" fill="#A5C2E0" />
          <rect x="1144" y="133" width="40" height="125" rx="2" fill="#D5DDE5" />
        </svg>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7">
        <div className="flex flex-col items-center text-center gap-2 sm:gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary-50 border border-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            <span className="text-[11px] sm:text-xs font-bold text-primary-700">{c.title}</span>
          </div>
          <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-neutral-800 leading-relaxed max-w-2xl">
            پلتفرم <span className="text-primary-700">مزایده آنلاین</span>،{' '}
            <span className="text-accent-600">خرید مستقیم</span>، سرگرمی و{' '}
            <span className="text-local-600">اقتصاد محلی</span>
          </h2>
          <p className="text-xs sm:text-base text-neutral-500 max-w-lg leading-relaxed">
            {c.description}
          </p>
        </div>
      </div>
    </section>
  );
}
