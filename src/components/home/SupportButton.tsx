import { Headset } from 'lucide-react';

export function SupportButton() {
  return (
    <button
      onClick={() => window.open('/support', '_self')}
      className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-700 text-white shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all duration-normal group"
      aria-label="پشتیبانی آنلاین"
    >
      <Headset className="w-5 h-5 group-hover:scale-110 transition-transform" />
      <span className="text-sm font-medium hidden sm:inline">پشتیبانی</span>
    </button>
  );
}
