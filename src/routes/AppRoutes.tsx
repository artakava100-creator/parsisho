import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from '@/components/guards/RouteGuards';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
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

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route
          path="/"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/auctions"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <AuctionListPage />
            </Suspense>
          }
        />
        <Route
          path="/auctions/:id"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <AuctionDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/market"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <StorePage />
            </Suspense>
          }
        />
        <Route
          path="/market/:id"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <ProductDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/cart"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <CartPage />
            </Suspense>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <CheckoutPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <OrderHistoryPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/success"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <OrderSuccessPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/excitement"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <ExcitementLandPage />
            </Suspense>
          }
        />
        <Route
          path="/excitement/guess-it"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <GuessItPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/businesses"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <BusinessListPage />
            </Suspense>
          }
        />
        <Route
          path="/businesses/:slug"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <BusinessDetailPage />
            </Suspense>
          }
        />

        {/* Auth - public only */}
        <Route
          path="/auth/sign-in"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <SignInPage />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/auth/sign-up"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <SignUpPage />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <ForgotPasswordPage />
              </Suspense>
            </PublicOnlyRoute>
          }
        />

        {/* Auth - public (accessible regardless of auth state) */}
        <Route
          path="/auth/check-email"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <CheckEmailPageWrapper />
            </Suspense>
          }
        />
        <Route
          path="/auth/verify-email"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <VerifyEmailPage />
            </Suspense>
          }
        />
        <Route
          path="/auth/reset-password"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <ResetPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/auth/callback"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <AuthCallbackPage />
            </Suspense>
          }
        />

        {/* Protected */}
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <WalletPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/missions" element={<ProtectedRoute><Placeholder config={placeholders.missions} /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Placeholder config={placeholders.referrals} /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Placeholder config={placeholders.rewards} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Placeholder config={placeholders.profile} /></ProtectedRoute>} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AccountPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/notifications" element={<ProtectedRoute><Placeholder config={placeholders.notifications} /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder config={placeholders.settings} /></ProtectedRoute>} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminDashboardPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/auctions"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminAuctionPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/packages"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminPackagePage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminPaymentPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/store-settings"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminStoreSettingsPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/excitement-land"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminExcitementLandPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/businesses"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminBusinessPage />
              </Suspense>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/ads"
          element={
            <AdminRoute>
              <Suspense fallback={<FullPageSpinner />}>
                <AdminAdPage />
              </Suspense>
            </AdminRoute>
          }
        />

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
