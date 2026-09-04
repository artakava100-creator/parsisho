import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Gavel, Wallet, Store, LogOut, LogIn,
  ShoppingCart, ShieldCheck, Search, X,
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
  { to: '/', label: 'خانه', end: true },
  { to: '/auctions', label: 'مزایده', icon: Gavel, end: false },
  { to: '/market', label: 'بازار', icon: Store, end: false },
];

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: wallet } = useWallet();
  const cartCount = useCartStore((s) => s.totalItems());

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('با موفقیت خارج شدید');
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/market?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 lg:h-24 gap-3">
          {/* Logo — 3x larger */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-white font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-none">پ</span>
            </div>
            <span className="text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold text-neutral-800 hidden sm:block tracking-tight whitespace-nowrap">
              {BRAND_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0" aria-label="منوی اصلی">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                      isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
                    )
                  }
                >
                  {Icon && <Icon className="w-[18px] h-[18px]" />}
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Search bar — expands inline */}
          <div className="hidden sm:flex flex-1 max-w-md mx-3">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در پارسی شو..."
                className="w-full h-10 pr-10 pl-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all"
              />
            </form>
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/80 text-neutral-500"
            aria-label="جستجو"
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          {/* Action controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex items-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-neutral-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all whitespace-nowrap"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold hidden md:block">سبد&zwnj;خرید</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-accent-500 text-white text-[10px] font-bold shadow-sm">
                  {toPersianDigits(cartCount)}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <>
                {isAdmin(user.role) && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl bg-primary-50 border border-primary-200/60 hover:border-primary-300 hover:bg-primary-100 transition-all whitespace-nowrap"
                    aria-label="پنل مدیریت"
                  >
                    <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0" />
                    <span className="text-sm font-semibold text-primary-700">مدیریت</span>
                  </Link>
                )}

                {/* Wallet balance */}
                <Link
                  to="/wallet"
                  className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:border-primary-200 hover:bg-primary-50 transition-all whitespace-nowrap"
                  aria-label="کیف پول"
                >
                  <Wallet className="w-5 h-5 text-primary-600 shrink-0" />
                  <span className="text-sm font-semibold font-num text-neutral-700">
                    {toPersianDigits((wallet?.availableBalance ?? 0).toLocaleString('en-US'))}
                  </span>
                </Link>

                {/* Profile */}
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 h-10 px-2 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:border-primary-200 hover:bg-primary-50 transition-all"
                  aria-label="حساب کاربری"
                >
                  <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                  <span className="text-sm font-semibold text-neutral-700 hidden lg:block max-w-[80px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/80 text-neutral-400 hover:text-error-600 hover:bg-error-50 hover:border-error-200 transition-all"
                  aria-label="خروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/auth/sign-in"
                className="flex items-center gap-2 h-10 px-4 sm:px-5 rounded-xl bg-primary-700 hover:bg-primary-600 text-white font-bold text-sm transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <LogIn className="w-5 h-5" />
                ورود
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="sm:hidden pb-3 animate-fade-in">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در پارسی شو..."
                className="w-full h-10 pr-10 pl-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all"
              />
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
