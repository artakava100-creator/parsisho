import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { SupportButton } from '@/components/home/SupportButton';

export function Layout() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <SupportButton />
    </div>
  );
}
