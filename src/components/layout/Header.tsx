import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Gavel, Wallet, Store, Trophy, Gamepad2, Home, LogOut, LogIn,
  ShoppingCart, ShieldCheck, Search, User,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/useAuth';
import { isAdmin } from '@/lib/permissions';
import { useToast } from '@/providers/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCartStore } from '@/stores/cart-store';
import { Avatar } from '@/components/ui/Avatar';
import { toPersianDigits } from '@/lib/persian';
import { BRAND_NAME } from '@/config/brand';

const navItems = [
  { to: '/', label: 'خانه', icon: Home, end: true },
  { to: '/auctions', label: 'مزایده', icon: Gavel, end: false },
  { to: '/market', label: 'بازار', icon: Store, end: false },
  { to: '/wallet', label: 'کیف پول پارسی', icon: Wallet, end: false },
  { to: '/missions', label: 'مأموریت‌ها', icon: Trophy, end: false },
  { to: '/excitement', label: 'سرزمین هیجان', icon: Gamepad2, end: false },
];

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: wallet } = useWallet();
  const cartCount = useCartStore((s) => s.totalItems());

  const handleSignOut = async () => {
    await signOut();
    toast.success('با موفقیت خارج شدید');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row: Logo + Actions — h-20 lg:h-24 (was h-14 lg:h-16 ≈ +50%) */}
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <span className="text-white font-extrabold text-lg lg:text-xl leading-none">پ</span>
            </div>
            <span className="text-xl lg:text-2xl font-extrabold text-neutral-800 hidden sm:block tracking-tight">
              {BRAND_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="منوی اصلی">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-normal',
                      isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
                    )
                  }
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Action controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Search */}
            <Link
              to="/market"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/80 text-neutral-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all duration-normal"
              aria-label="جستجو"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex items-center gap-2 h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-neutral-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all duration-normal"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs font-semibold hidden sm:block">سبد خرید</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-accent-500 text-white text-[10px] font-bold font-num shadow-sm">
                  {toPersianDigits(cartCount)}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <>
                {isAdmin(user.role) && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-xl bg-primary-50 border border-primary-200/60 hover:border-primary-300 hover:bg-primary-100 transition-all duration-normal"
                    aria-label="پنل مدیریت"
                  >
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-semibold text-primary-700">مدیریت</span>
                  </Link>
                )}

                {/* Wallet balance */}
                <Link
                  to="/wallet"
                  className="hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:border-primary-200 hover:bg-primary-50 transition-all duration-normal"
                  aria-label="کیف پول"
                >
                  <Wallet className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-semibold font-num text-neutral-700">
                    {toPersianDigits((wallet?.availableBalance ?? 0).toLocaleString('en-US'))}
                  </span>
                </Link>

                {/* Profile */}
                <Link
                  to="/account"
                  className="flex items-center gap-2 h-10 px-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:border-primary-200 hover:bg-primary-50 transition-all duration-normal"
                  aria-label="حساب کاربری"
                >
                  <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                  <span className="text-sm font-semibold text-neutral-700 hidden sm:block max-w-[90px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/80 text-neutral-400 hover:text-error-600 hover:bg-error-50 hover:border-error-200 transition-all duration-normal"
                  aria-label="خروج از حساب"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/auth/sign-in"
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-700 hover:bg-primary-600 text-white font-bold text-sm transition-all duration-normal shadow-sm hover:shadow-md"
              >
                <LogIn className="w-5 h-5" />
                ورود
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
