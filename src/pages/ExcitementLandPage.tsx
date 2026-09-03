import { Link } from 'react-router-dom';
import {
  Brain,
  Disc3,
  Target,
  ArrowLeft,
  Trophy,
  Ticket,
  Users,
  Lock,
  Sparkles,
  Gamepad2,
  Hexagon,
  Spline,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

/* ───────────────────────────────────────────────
   Geometric hero visual — abstract game emblem
   ─────────────────────────────────────────────── */
function HeroEmblem() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Rotating hexagon frame */}
      <div className="absolute w-[300px] h-[300px] sm:w-[360px] sm:h-[360px]">
        <div
          className="absolute inset-0 rounded-[44px] border border-primary-500/20"
          style={{ transform: 'rotate(15deg)' }}
        />
        <div
          className="absolute inset-6 rounded-[36px] border border-secondary-500/15"
          style={{ transform: 'rotate(-12deg)' }}
        />
        <div
          className="absolute inset-12 rounded-[28px] border border-accent-500/12"
          style={{ transform: 'rotate(8deg)' }}
        />
      </div>

      {/* Floating geometric shards */}
      <div className="absolute top-[18%] left-[22%] w-12 h-12 rounded-lg bg-primary-50 border border-primary-300 rotate-12 animate-pulse-glow" />
      <div className="absolute bottom-[22%] right-[20%] w-10 h-10 rounded-full bg-secondary-500/10 border border-secondary-500/25" />
      <div className="absolute top-[28%] right-[28%] w-7 h-7 bg-accent-50 rounded-sm rotate-45" />
      <div className="absolute bottom-[30%] left-[26%] w-8 h-8 border-2 border-primary-400/30 rounded-full" />

      {/* Central brain emblem */}
      <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-primary-700/20 via-primary-600/10 to-secondary-700/20 border border-primary-400/30 flex items-center justify-center shadow-glow-primary">
        <Brain className="w-12 h-12 sm:w-14 sm:h-14 text-primary-700" />
      </div>

      {/* Orbital dots */}
      <div className="absolute w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] animate-[spin_18s_linear_infinite]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary-400 shadow-glow-primary" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-secondary-400" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-400" />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Featured game — asymmetric editorial layout
   ─────────────────────────────────────────────── */
function FeaturedGame() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="relative">
        {/* Asymmetric grid: visual 7 cols, content 5 cols */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 items-stretch">
          {/* ── Visual / game-art side ── */}
          <div className="lg:col-span-7 relative min-h-[280px] sm:min-h-[360px] lg:min-h-[440px] rounded-2xl lg:rounded-l-2xl lg:rounded-r-none overflow-hidden bg-gradient-to-br from-primary-950/60 via-surface-raised to-secondary-950/40 border border-primary-500/20">
            {/* Layered geometric backdrop */}
            <div className="absolute inset-0">
              {/* Diagonal grid lines */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(115deg, transparent, transparent 38px, rgba(45,212,191,0.4) 38px, rgba(45,212,191,0.4) 39px)',
                }}
              />
              {/* Large concentric arcs */}
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full border border-primary-500/10" />
              <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full border border-primary-500/15" />
              <div className="absolute -top-2 right-2 w-40 h-40 rounded-full border border-secondary-500/12" />

              {/* Floating question marks / puzzle motifs */}
              <div className="absolute top-12 left-10 w-14 h-14 rounded-xl border-2 border-primary-500/20 flex items-center justify-center text-primary-600/40 text-2xl font-bold rotate-6">
                ؟
              </div>
              <div className="absolute bottom-16 left-20 w-10 h-10 rounded-lg border-2 border-secondary-500/20 rotate-12" />
              <div className="absolute bottom-8 right-24 w-12 h-12 rounded-full border-2 border-accent-500/20" />
              <div className="absolute top-1/3 right-12 text-secondary-600/30 text-3xl font-bold rotate-[-8deg]">
                ؟
              </div>
            </div>

            {/* Center emblem */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary-500/8 blur-3xl scale-150" />
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-primary-700/15 to-secondary-600/15 border border-primary-400/25 flex items-center justify-center animate-pulse-glow">
                  <Brain className="w-14 h-14 sm:w-16 sm:h-16 text-primary-700" />
                </div>
              </div>
            </div>

            {/* Corner badge */}
            <div className="absolute top-5 right-5">
              <Badge tone="success" variant="solid">
                <span className="w-1.5 h-1.5 rounded-full bg-success-950 animate-pulse" />
                بازی فعال
              </Badge>
            </div>

            {/* Bottom strip */}
            <div className="absolute bottom-0 inset-x-0 px-6 py-4 bg-gradient-to-t from-surface-sunken/80 to-transparent">
              <div className="flex items-center gap-2 text-primary-700">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">چالش روزانه فعال — همین حالا شرکت کن</span>
              </div>
            </div>
          </div>

          {/* ── Content side ── */}
          <div className="lg:col-span-5 relative bg-surface-raised/60 border border-primary-500/15 lg:border-r-0 rounded-2xl lg:rounded-l-none lg:rounded-r-2xl p-7 sm:p-9 lg:p-10 flex flex-col justify-between gap-8">
            {/* Decorative corner accent */}
            <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-primary-500/20 rounded-tl-2xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-px bg-primary-500/50" />
                <span className="text-xs font-semibold text-primary-600 tracking-wide">بازی ویژه</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-800 mb-3 leading-tight">
                حدس بزن
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 leading-relaxed mb-7 max-w-md">
                تصویر یا معما را ببین، پاسخ بده و در صورت پاسخ صحیح وارد قرعه‌کشی برندگان شو. هر چالش یک شانس جدید است.
              </p>

              {/* Entry / prize info row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-sunken/70 border border-neutral-200/60 flex-1 min-w-[130px]">
                  <div className="w-9 h-9 rounded-lg bg-primary-500/12 flex items-center justify-center shrink-0">
                    <Ticket className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">ورودی</p>
                    <p className="text-sm font-bold text-neutral-800">رایگان</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-sunken/70 border border-neutral-200/60 flex-1 min-w-[130px]">
                  <div className="w-9 h-9 rounded-lg bg-accent-500/12 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">جایزه</p>
                    <p className="text-sm font-bold text-neutral-800">پارسی</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-sunken/70 border border-neutral-200/60 flex-1 min-w-[130px]">
                  <div className="w-9 h-9 rounded-lg bg-secondary-500/12 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-secondary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">قرعه‌کشی</p>
                    <p className="text-sm font-bold text-neutral-800">شفاف</p>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/excitement/guess-it" className="block">
              <Button variant="primary" fullWidth size="lg" className="group">
                <Play className="w-5 h-5 fill-current" />
                شروع بازی
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   Game hub — three distinct tiles
   ─────────────────────────────────────────────── */

interface GameTileProps {
  slug: string;
  title: string;
  description: string;
  status: 'active' | 'soon';
  variant: 'brain' | 'wheel' | 'target';
}

const gameTiles: GameTileProps[] = [
  {
    slug: 'guess_it',
    title: 'حدس بزن',
    description: 'تصویر یا معما را ببین، پاسخ بده و وارد قرعه‌کشی شو.',
    status: 'active',
    variant: 'brain',
  },
  {
    slug: 'lucky_wheel',
    title: 'گردونه شانس',
    description: 'گردونه را بچرخان و ببین شانس چه جایزه‌ای برایت دارد.',
    status: 'soon',
    variant: 'wheel',
  },
  {
    slug: 'gol_ya_poch',
    title: 'گل یا پوچ',
    description: 'پیش‌بینی کن و ببین آیا گل می‌زنی یا پوچ می‌شوی.',
    status: 'soon',
    variant: 'target',
  },
];

function GameTile({ tile, index }: { tile: GameTileProps; index: number }) {
  const isActive = tile.status === 'active';

  return (
    <div
      className={`relative animate-fade-in-up ${!isActive ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* ── Brain tile: tall, top-icon, teal accent ── */}
      {tile.variant === 'brain' && (
        <Link to="/excitement/guess-it" className="block h-full group">
          <div className="relative h-full rounded-2xl overflow-hidden border border-primary-500/25 bg-gradient-to-b from-primary-950/30 to-surface-raised p-6 transition-all duration-slow group-hover:border-primary-400 group-hover:shadow-glow-primary flex flex-col">
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-60" />

            {/* Icon — large rounded square */}
            <div className="w-16 h-16 rounded-2xl bg-primary-500/12 border border-primary-300 flex items-center justify-center mb-5 transition-transform duration-slow group-hover:scale-110">
              <Brain className="w-8 h-8 text-primary-600" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-neutral-800">{tile.title}</h3>
              <Badge tone="success" variant="solid">
                <span className="w-1.5 h-1.5 rounded-full bg-success-950 animate-pulse" />
                فعال
              </Badge>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed mb-6 flex-1">{tile.description}</p>

            <div className="flex items-center gap-2 text-primary-700 text-sm font-semibold group-hover:gap-3 transition-all">
              <Play className="w-4 h-4 fill-current" />
              شروع بازی
            </div>
          </div>
        </Link>
      )}

      {/* ── Wheel tile: wide circular motif, orange accent ── */}
      {tile.variant === 'wheel' && (
        <div className="relative h-full rounded-2xl overflow-hidden border border-warning-500/20 bg-gradient-to-br from-warning-950/20 via-surface-raised to-surface-sunken/40 p-6 flex flex-col">
          {/* Circular decorative backdrop */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-[3px] border-warning-500/15" />
          <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full border-2 border-warning-500/10" />

          {/* Icon — circular with spokes */}
          <div className="relative w-16 h-16 rounded-full bg-warning-50 border-2 border-warning-500/25 flex items-center justify-center mb-5">
            <Disc3 className="w-8 h-8 text-warning-600 animate-[spin_6s_linear_infinite]" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-neutral-800">{tile.title}</h3>
            <Badge tone="warning" variant="soft">
              <Lock className="w-3 h-3" />
              به‌زودی
            </Badge>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6 flex-1">{tile.description}</p>

          <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium">
            <Lock className="w-4 h-4" />
            به‌زودی فعال می‌شود
          </div>
        </div>
      )}

      {/* ── Target tile: angular / crosshair motif, blue accent ── */}
      {tile.variant === 'target' && (
        <div className="relative h-full rounded-2xl overflow-hidden border border-secondary-500/20 bg-gradient-to-bl from-secondary-950/25 via-surface-raised to-surface-sunken/40 p-6 flex flex-col">
          {/* Crosshair decorative backdrop */}
          <div className="absolute top-6 right-6 w-32 h-32 opacity-20">
            <div className="absolute top-1/2 inset-x-0 h-px bg-secondary-400" />
            <div className="absolute left-1/2 inset-y-0 w-px bg-secondary-400" />
            <div className="absolute inset-8 rounded-full border border-secondary-400/40" />
            <div className="absolute inset-14 rounded-full border border-secondary-400/30" />
          </div>

          {/* Icon — diamond shape */}
          <div className="relative w-16 h-16 rounded-xl bg-secondary-500/10 border border-secondary-500/30 flex items-center justify-center mb-5 rotate-12">
            <Target className="w-8 h-8 text-secondary-600 -rotate-12" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-neutral-800">{tile.title}</h3>
            <Badge tone="warning" variant="soft">
              <Lock className="w-3 h-3" />
              به‌زودی
            </Badge>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6 flex-1">{tile.description}</p>

          <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium">
            <Lock className="w-4 h-4" />
            به‌زودی فعال می‌شود
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Page
   ─────────────────────────────────────────────── */
export function ExcitementLandPage() {
  return (
    <div className="animate-fade-in">
      {/* ════════════════════════════════════════════
          HERO — dark premium identity
         ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-surface-sunken">
        {/* Ambient lighting — blue/teal/orange pools */}
        <div className="absolute top-0 right-1/4 w-[420px] h-[360px] bg-primary-50 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[380px] h-[320px] bg-secondary-600/8 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-10 w-[200px] h-[200px] bg-accent-500/6 rounded-full blur-[120px]" />

        {/* Geometric grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* Bottom fade into page */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-surface to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Text side */}
            <div className="lg:col-span-6 text-center lg:text-right order-2 lg:order-1">
              {/* Label */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-500/25 bg-primary-500/8 mb-6">
                <Hexagon className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700 tracking-wide">سرزمین هیجان</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-neutral-800 leading-[1.1] tracking-tight mb-6">
                بازی کن،
                <br />
                <span className="text-gradient-primary">پارسی ببر</span>
              </h1>

              {/* Supporting text */}
              <p className="text-base sm:text-lg text-neutral-500 leading-relaxed max-w-lg mx-auto lg:mx-0 lg:ml-auto lg:text-right mb-8">
                چالش‌های هیجان‌انگیز را امتحان کن، مهارت و شانس خودت را به آزمایش بگذار و جایزه پارسی ببر.
              </p>

              {/* Quick stats */}
              <div className="flex items-center justify-center lg:justify-start gap-6 lg:gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-500/20 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-sm text-neutral-600">۳ بازی</span>
                </div>
                <div className="w-px h-8 bg-neutral-200" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-success-50 border border-success-500/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
                  </div>
                  <span className="text-sm text-neutral-600">۱ بازی فعال</span>
                </div>
                <div className="w-px h-8 bg-neutral-200" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 border border-accent-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-accent-600" />
                  </div>
                  <span className="text-sm text-neutral-600">جایزه پارسی</span>
                </div>
              </div>
            </div>

            {/* Visual side */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="relative aspect-square max-w-[460px] mx-auto">
                <HeroEmblem />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURED GAME — asymmetric editorial
         ════════════════════════════════════════════ */}
      <FeaturedGame />

      {/* ════════════════════════════════════════════
          GAME HUB — three distinct tiles
         ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-primary-600 to-secondary-500" />
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-800">بازی‌های سرزمین هیجان</h2>
              <p className="text-sm text-neutral-500 mt-0.5">هر بازی یک شانس جدید برای برد</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
            <Spline className="w-4 h-4" />
            <span>۳ بازی</span>
          </div>
        </div>

        {/* Tiles — asymmetric layout: first tile wider on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          <div className="sm:col-span-2 lg:col-span-5">
            <GameTile tile={gameTiles[0]} index={0} />
          </div>
          <div className="lg:col-span-4">
            <GameTile tile={gameTiles[1]} index={1} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <GameTile tile={gameTiles[2]} index={2} />
          </div>
        </div>
      </section>
    </div>
  );
}
