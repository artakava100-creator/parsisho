import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Gavel, Wallet, Store, Trophy, Gamepad2, Home, LogOut, LogIn,
  ShoppingCart, ShieldCheck, Search,
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
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-base leading-none">پ</span>
            </div>
            <span className="text-lg font-extrabold text-neutral-800 hidden sm:block">
              {BRAND_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="منوی اصلی">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search */}
            <Link
              to="/market"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-neutral-50 transition-colors"
              aria-label="جستجو"
            >
              <Search className="w-[18px] h-[18px]" />
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-neutral-50 transition-colors"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="w-[18px] h-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-accent-500 text-white text-[9px] font-bold font-num">
                  {toPersianDigits(cartCount)}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <>
                {isAdmin(user.role) && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 hover:border-primary-300 transition-colors"
                    aria-label="پنل مدیریت"
                  >
                    <ShieldCheck className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-medium text-neutral-600">مدیریت</span>
                  </Link>
                )}

                {/* Wallet balance */}
                <Link
                  to="/wallet"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 hover:border-primary-300 transition-colors"
                  aria-label="کیف پول"
                >
                  <Wallet className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-num text-neutral-700">
                    {toPersianDigits((wallet?.availableBalance ?? 0).toLocaleString('en-US'))}
                  </span>
                </Link>

                {/* Profile */}
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-neutral-50 transition-colors"
                  aria-label="حساب کاربری"
                >
                  <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                  <span className="text-xs text-neutral-600 hidden sm:block max-w-[80px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                  aria-label="خروج از حساب"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth/sign-in"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 text-white font-semibold text-xs transition-colors"
              >
                <LogIn className="w-4 h-4" />
                ورود
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
