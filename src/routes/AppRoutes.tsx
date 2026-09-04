import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from '@/components/guards/RouteGuards';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPlaceholderPage } from '@/components/admin/AdminPlaceholderPage';
import { Gavel, Store, Wallet, Trophy, Gamepad2, Users, Building2, Gift, User, Bell, Settings, ShieldCheck, Megaphone } from 'lucide-react';

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const SignInPage = lazy(() => import('@/pages/auth/SignInPage').then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage').then((m) => ({ default: m.SignUpPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const CheckEmailPage = lazy(() => import('@/pages/auth/CheckEmailPage').then((m) => ({ default: m.CheckEmailPage })));
const AuctionListPage = lazy(() => import('@/pages/auction/AuctionListPage').then((m) => ({ default: m.AuctionListPage })));
const AuctionDetailPage = lazy(() => import('@/pages/auction/AuctionDetailPage').then((m) => ({ default: m.AuctionDetailPage })));
const AdminAuctionPage = lazy(() => import('@/pages/admin/AdminAuctionPage').then((m) => ({ default: m.AdminAuctionPage })));
const AdminPackagePage = lazy(() => import('@/pages/admin/AdminPackagePage').then((m) => ({ default: m.AdminPackagePage })));
const AdminPaymentPage = lazy(() => import('@/pages/admin/AdminPaymentPage').then((m) => ({ default: m.AdminPaymentPage })));
const AdminStoreSettingsPage = lazy(() => import('@/pages/admin/AdminStoreSettingsPage').then((m) => ({ default: m.AdminStoreSettingsPage })));
const AdminExcitementLandPage = lazy(() => import('@/pages/admin/AdminExcitementLandPage').then((m) => ({ default: m.AdminExcitementLandPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const WalletPage = lazy(() => import('@/pages/WalletPage').then((m) => ({ default: m.WalletPage })));
const StorePage = lazy(() => import('@/pages/StorePage').then((m) => ({ default: m.StorePage })));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })));
const OrderHistoryPage = lazy(() => import('@/pages/OrderHistoryPage').then((m) => ({ default: m.OrderHistoryPage })));
const ExcitementLandPage = lazy(() => import('@/pages/ExcitementLandPage').then((m) => ({ default: m.ExcitementLandPage })));
const GuessItPage = lazy(() => import('@/pages/GuessItPage').then((m) => ({ default: m.GuessItPage })));
const BusinessListPage = lazy(() => import('@/pages/business/BusinessListPage').then((m) => ({ default: m.BusinessListPage })));
const BusinessDetailPage = lazy(() => import('@/pages/business/BusinessDetailPage').then((m) => ({ default: m.BusinessDetailPage })));
const AdminBusinessPage = lazy(() => import('@/pages/admin/AdminBusinessPage').then((m) => ({ default: m.AdminBusinessPage })));
const AdminAdPage = lazy(() => import('@/pages/admin/AdminAdPage').then((m) => ({ default: m.AdminAdPage })));
const AdminStorefrontPage = lazy(() => import('@/pages/admin/AdminStorefrontPage').then((m) => ({ default: m.AdminStorefrontPage })));
const AdminProductListPage = lazy(() => import('@/pages/admin/AdminProductListPage').then((m) => ({ default: m.AdminProductListPage })));
const AdminProductDetailPage = lazy(() => import('@/pages/admin/AdminProductDetailPage').then((m) => ({ default: m.AdminProductDetailPage })));
const AdminCategoryPage = lazy(() => import('@/pages/admin/AdminCategoryPage').then((m) => ({ default: m.AdminCategoryPage })));
const AdminBrandPage = lazy(() => import('@/pages/admin/AdminBrandPage').then((m) => ({ default: m.AdminBrandPage })));
const AdminAttributePage = lazy(() => import('@/pages/admin/AdminAttributePage').then((m) => ({ default: m.AdminAttributePage })));
const AdminMarketplaceDashboardPage = lazy(() => import('@/pages/admin/AdminMarketplaceDashboardPage').then((m) => ({ default: m.AdminMarketplaceDashboardPage })));

const placeholders = {
  auctions: { title: 'تالار مزایده', description: 'مزایده‌های زنده و مهیج پارسیشو', icon: <Gavel className="w-8 h-8" /> },
  market: { title: 'بازار مستقیم', description: 'خرید مستقیم محصولات پارسیشو', icon: <Store className="w-8 h-8" /> },
  wallet: { title: 'بانک پارسیشو', description: 'مدیریت کیف پول و تراکنش‌ها', icon: <Wallet className="w-8 h-8" /> },
  missions: { title: 'مرکز ماموریت‌ها', description: 'ماموریت‌های روزانه، هفتگی و ویژه', icon: <Trophy className="w-8 h-8" /> },
  excitement: { title: 'سرزمین هیجان پارسی', description: 'بازی‌های کوتاه و مهیج پارسیشو', icon: <Gamepad2 className="w-8 h-8" /> },
  referrals: { title: 'دعوت دوستان', description: 'دعوت دوستان و کسب جوایز', icon: <Users className="w-8 h-8" /> },
  businesses: { title: 'محله کسب‌وکار', description: 'کسب‌وکارهای محلی و تخفیف‌ها', icon: <Building2 className="w-8 h-8" /> },
  rewards: { title: 'خانه جایزه', description: 'جایزه روزانه و جوایز فصلی', icon: <Gift className="w-8 h-8" /> },
  profile: { title: 'حساب کاربری', description: 'مدیریت حساب کاربری شما', icon: <User className="w-8 h-8" /> },
  notifications: { title: 'اعلان‌ها', description: 'اعلان‌های پارسیشو', icon: <Bell className="w-8 h-8" /> },
  settings: { title: 'تنظیمات', description: 'تنظیمات حساب کاربری', icon: <Settings className="w-8 h-8" /> },
  admin: { title: 'پنل مدیریت', description: 'مدیریت پارسیشو', icon: <ShieldCheck className="w-8 h-8" /> },
};

const notFound = { title: 'صفحه پیدا نشد', description: 'صفحه‌ای که دنبال آن هستید وجود ندارد', icon: <Gavel className="w-8 h-8" /> };

function Placeholder({ config }: { config: { title: string; description: string; icon: React.ReactNode } }) {
  return <PlaceholderPage title={config.title} description={config.description} icon={config.icon} />;
}

function AdminPlaceholder({ title, description }: { title: string; description?: string }) {
  return <AdminPlaceholderPage title={title} description={description} />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* ─── Consumer routes (unchanged) ─── */}
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Suspense fallback={<FullPageSpinner />}><HomePage /></Suspense>} />
        <Route path="/auctions" element={<Suspense fallback={<FullPageSpinner />}><AuctionListPage /></Suspense>} />
        <Route path="/auctions/:id" element={<Suspense fallback={<FullPageSpinner />}><AuctionDetailPage /></Suspense>} />
        <Route path="/market" element={<Suspense fallback={<FullPageSpinner />}><StorePage /></Suspense>} />
        <Route path="/market/:id" element={<Suspense fallback={<FullPageSpinner />}><ProductDetailPage /></Suspense>} />
        <Route path="/cart" element={<Suspense fallback={<FullPageSpinner />}><CartPage /></Suspense>} />
        <Route path="/checkout" element={<ProtectedRoute><Suspense fallback={<FullPageSpinner />}><CheckoutPage /></Suspense></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Suspense fallback={<FullPageSpinner />}><OrderHistoryPage /></Suspense></ProtectedRoute>} />
        <Route path="/orders/:id/success" element={<ProtectedRoute><Suspense fallback={<FullPageSpinner />}><OrderSuccessPage /></Suspense></ProtectedRoute>} />
        <Route path="/excitement" element={<Suspense fallback={<FullPageSpinner />}><ExcitementLandPage /></Suspense>} />
        <Route path="/excitement/guess-it" element={<ProtectedRoute><Suspense fallback={<FullPageSpinner />}><GuessItPage /></Suspense></ProtectedRoute>} />
        <Route path="/businesses" element={<Suspense fallback={<FullPageSpinner />}><BusinessListPage /></Suspense>} />
        <Route path="/businesses/:slug" element={<Suspense fallback={<FullPageSpinner />}><BusinessDetailPage /></Suspense>} />

        {/* Auth - public only */}
        <Route path="/auth/sign-in" element={<PublicOnlyRoute><Suspense fallback={<FullPageSpinner />}><SignInPage /></Suspense></PublicOnlyRoute>} />
        <Route path="/auth/sign-up" element={<PublicOnlyRoute><Suspense fallback={<FullPageSpinner />}><SignUpPage /></Suspense></PublicOnlyRoute>} />
        <Route path="/auth/forgot-password" element={<PublicOnlyRoute><Suspense fallback={<FullPageSpinner />}><ForgotPasswordPage /></Suspense></PublicOnlyRoute>} />

        {/* Auth - public */}
        <Route path="/auth/check-email" element={<Suspense fallback={<FullPageSpinner />}><CheckEmailPageWrapper /></Suspense>} />
        <Route path="/auth/verify-email" element={<Suspense fallback={<FullPageSpinner />}><VerifyEmailPage /></Suspense>} />
        <Route path="/auth/reset-password" element={<Suspense fallback={<FullPageSpinner />}><ResetPasswordPage /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={<FullPageSpinner />}><AuthCallbackPage /></Suspense>} />

        {/* Protected */}
        <Route path="/wallet" element={<ProtectedRoute><Suspense fallback={<FullPageSpinner />}><WalletPage /></Suspense></ProtectedRoute>} />
        <Route path="/missions" element={<ProtectedRoute><Placeholder config={placeholders.missions} /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Placeholder config={placeholders.referrals} /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Placeholder config={placeholders.rewards} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Placeholder config={placeholders.profile} /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Suspense fallback={<FullPageSpinner />}><AccountPage /></Suspense></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Placeholder config={placeholders.notifications} /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder config={placeholders.settings} /></ProtectedRoute>} />

        {/* ─── Admin ─── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout>
                <Suspense fallback={<FullPageSpinner />}>
                  <AdminDashboardPage />
                </Suspense>
              </AdminLayout>
            </AdminRoute>
          }
        />

        {/* ── Legacy admin redirects ── */}
        <Route path="/admin/auctions" element={<Navigate to="/admin/marketplace/auctions" replace />} />
        <Route path="/admin/packages" element={<Navigate to="/admin/system/packages" replace />} />
        <Route path="/admin/payments" element={<Navigate to="/admin/system/payments" replace />} />
        <Route path="/admin/store-settings" element={<Navigate to="/admin/system/settings" replace />} />
        <Route path="/admin/excitement-land" element={<Navigate to="/admin/marketplace/engagement" replace />} />
        <Route path="/admin/businesses" element={<Navigate to="/admin/marketplace/businesses" replace />} />
        <Route path="/admin/ads" element={<Navigate to="/admin/marketplace/ads" replace />} />

        {/* ── Marketplace Control Center ── */}
        <Route path="/admin/marketplace" element={
          <AdminRoute>
            <AdminLayout>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminMarketplaceDashboardPage />
              </Suspense>
            </AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/storefront" element={
          <AdminRoute permission="storefront.manage">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminStorefrontPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/products" element={
          <AdminRoute permission="products.manage">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminProductListPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/products/:id" element={
          <AdminRoute permission="products.manage">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminProductDetailPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/categories" element={
          <AdminRoute permission="categories.manage">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminCategoryPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/brands" element={
          <AdminRoute permission="brands.manage">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminBrandPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/attributes" element={
          <AdminRoute permission="attributes.manage">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminAttributePage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/media" element={
          <AdminRoute permission="manage_store_media">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="رسانه‌ها" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/slideshow" element={
          <AdminRoute permission="manage_store_slideshow">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="اسلایدشو" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/merchandising" element={
          <AdminRoute permission="manage_store_merchandising">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="مرچندایزینگ" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/inventory" element={
          <AdminRoute permission="manage_store_inventory">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="مدیریت موجودی" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/pricing" element={
          <AdminRoute permission="manage_store_pricing">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="قیمت‌گذاری" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/search" element={
          <AdminRoute permission="manage_store_search">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="تنظیمات جستجو" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/promotions" element={
          <AdminRoute permission="manage_store_promotions">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="تخفیف‌ها و پروموشن" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/orders" element={
          <AdminRoute permission="manage_store_orders">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="مدیریت سفارش‌ها" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/sellers" element={
          <AdminRoute permission="manage_store_sellers">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="فروشندگان" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/customers" element={
          <AdminRoute permission="manage_store_customers">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="مشتریان" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/reviews" element={
          <AdminRoute permission="manage_store_reviews">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="نظرات" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/shipping" element={
          <AdminRoute permission="manage_store_shipping">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="تنظیمات ارسال" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/analytics" element={
          <AdminRoute permission="manage_store_analytics">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="تحلیل‌ها" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/auctions" element={
          <AdminRoute permission="manage_auctions">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminAuctionPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/engagement" element={
          <AdminRoute permission="manage_missions">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminExcitementLandPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/businesses" element={
          <AdminRoute permission="manage_businesses">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminBusinessPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/ads" element={
          <AdminRoute permission="manage_content">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminAdPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />

        {/* ── System Administration ── */}
        <Route path="/admin/system" element={
          <AdminRoute>
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="مدیریت سیستم" description="بخش‌های مدیریت سیستم" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/admin-users" element={
          <AdminRoute permission="manage_system_admins">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="کاربران مدیر" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/roles" element={
          <AdminRoute permission="manage_system_roles">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="نقش‌ها و دسترسی‌ها" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/audit-log" element={
          <AdminRoute permission="manage_system_audit">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="لاگ ممیزی" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/security" element={
          <AdminRoute permission="manage_system_security">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="امنیت" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/settings" element={
          <AdminRoute permission="manage_settings">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminStoreSettingsPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/health" element={
          <AdminRoute permission="manage_system_health">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="سلامت سیستم" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/super-admin" element={
          <AdminRoute permission="manage_settings">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPlaceholder title="سوپر ادمین" /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/packages" element={
          <AdminRoute permission="manage_system_packages">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPackagePage /></Suspense></AdminLayout>
          </AdminRoute>
        } />
        <Route path="/admin/system/payments" element={
          <AdminRoute permission="manage_system_payments">
            <AdminLayout><Suspense fallback={<FullPageSpinner />}><AdminPaymentPage /></Suspense></AdminLayout>
          </AdminRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<Placeholder config={notFound} />} />
      </Route>
    </Routes>
  );
}

function CheckEmailPageWrapper() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;
  return <CheckEmailPage email={email} />;
}
