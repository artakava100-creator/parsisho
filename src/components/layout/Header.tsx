import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Gavel, Wallet, Store, Trophy, Gamepad2, Home, LogOut, LogIn, ShoppingCart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/useAuth';
import { isAdmin } from '@/lib/permissions';
import { useToast } from '@/providers/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCartStore } from '@/stores/cart-store';
import { Avatar } from '@/components/ui/Avatar';
import { toPersianDigits } from '@/lib/persian';

const navItems = [
  { to: '/', label: 'میدان شهر', icon: Home, end: true },
  { to: '/auctions', label: 'مزایده', icon: Gavel, end: false },
  { to: '/market', label: 'بازار', icon: Store, end: false },
  { to: '/wallet', label: 'کیف پول', icon: Wallet, end: false },
  { to: '/missions', label: 'ماموریت‌ها', icon: Trophy, end: false },
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
    <header className="sticky top-0 z-50 glass border-b border-neutral-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-primary">
              <span className="text-neutral-800 font-extrabold text-lg">پ</span>
            </div>
            <span className="text-xl font-extrabold text-neutral-800 hidden sm:block">
              پارسیشو
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-normal',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-surface-overlay',
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
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-primary-700 hover:bg-surface-overlay transition-colors"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-accent-600 text-neutral-800 text-[10px] font-bold font-num">
                  {toPersianDigits(cartCount)}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <>
                {isAdmin(user.role) && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay border border-neutral-300 hover:border-primary-400 transition-colors"
                    aria-label="پنل مدیریت"
                  >
                    <ShieldCheck className="w-4 h-4 text-primary-700" />
                    <span className="text-sm font-medium text-neutral-700 hidden sm:block">پنل مدیریت</span>
                  </Link>
                )}
                <Link
                  to="/wallet"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay border border-neutral-300 hover:border-primary-400 transition-colors"
                >
                  <Wallet className="w-4 h-4 text-primary-700" />
                  <span className="text-sm font-num text-neutral-700">{toPersianDigits((wallet?.availableBalance ?? 0).toLocaleString('en-US'))} پارسی</span>
                </Link>
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-overlay border border-neutral-300 hover:border-primary-400 transition-colors"
                >
                  <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                  <span className="text-sm text-neutral-700 hidden sm:block max-w-[100px] truncate">
                    {user.displayName}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors"
                  aria-label="خروج از حساب"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth/sign-in"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-neutral-800 font-semibold text-sm transition-colors"
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
