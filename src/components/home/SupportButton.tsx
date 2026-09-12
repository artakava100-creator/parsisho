import { useState } from 'react';
import { Headset, X, Send } from 'lucide-react';

export function SupportButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="support-btn-glow fixed bottom-[4.75rem] lg:bottom-5 right-5 z-[60] flex items-center gap-2 h-11 ps-3.5 pe-4 rounded-full bg-gradient-to-br from-primary-700 to-primary-800 text-white shadow-lg shadow-primary-900/25 hover:from-primary-600 hover:to-primary-700 hover:-translate-y-0.5 group"
        aria-label="پشتیبانی زنده"
      >
        <span className="relative flex items-center justify-center w-6 h-6 shrink-0">
          {panelOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <>
              <Headset className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="support-ring-ping absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success-400" />
              <span className="support-dot-pulse absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success-400 ring-2 ring-primary-800" />
            </>
          )}
        </span>
        <span className="text-sm font-bold whitespace-nowrap leading-none tracking-tight">
          پشتیبانی زنده
        </span>
      </button>

      {panelOpen && (
        <div className="fixed bottom-[7.75rem] lg:bottom-[3.75rem] right-5 z-[60] w-[calc(100vw-2.5rem)] sm:w-[320px] bg-white rounded-2xl shadow-2xl border border-neutral-200 animate-scale-in overflow-hidden">
          <div className="bg-gradient-to-br from-primary-700 to-primary-800 text-white px-4 py-3 flex items-center gap-2">
            <Headset className="w-5 h-5" />
            <span className="text-sm font-bold">پشتیبانی آنلاین پارسی شو</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-neutral-600 leading-relaxed">
              سلام! چطور می‌تونیم کمکتون کنیم؟ پیام خود را بنویسید یا از طریق راه‌های ارتباطی زیر با ما تماس بگیرید.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) {
                  setMessage('');
                  setPanelOpen(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="پیام شما..."
                className="flex-1 h-10 px-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex gap-2 pt-1">
              <a
                href="https://t.me/parsisho"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all"
              >
                تلگرام
              </a>
              <a
                href="tel:02112345678"
                className="flex-1 text-center py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all"
              >
                تماس تلفنی
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
