import { useState } from 'react';
import { Headset, X, Send } from 'lucide-react';

export function SupportButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      {/* Floating fixed support button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="fixed bottom-20 sm:bottom-24 lg:bottom-6 right-3 sm:right-4 lg:right-6 z-[60] flex items-center gap-2 h-11 sm:h-12 ps-3 sm:ps-3.5 pe-4 sm:pe-5 rounded-full bg-primary-700 text-white shadow-lg shadow-primary-800/20 hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-700/25 transition-all duration-300 group support-glow-ring"
        aria-label="پشتیبانی زنده"
      >
        <span className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 shrink-0">
          {panelOpen
            ? <X className="w-5 h-5 sm:w-6 sm:h-6" />
            : <Headset className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
          }
        </span>
        <span className="text-sm font-bold whitespace-nowrap leading-none">
          پشتیبانی زنده
        </span>
      </button>

      {/* Support panel */}
      {panelOpen && (
        <div className="fixed bottom-[5.75rem] sm:bottom-[6.75rem] lg:bottom-[4.5rem] right-3 sm:right-4 lg:right-6 z-[60] w-[calc(100vw-1.5rem)] sm:w-[300px] sm:w-[340px] bg-white rounded-xl sm:rounded-2xl shadow-lg border border-neutral-200 animate-scale-in overflow-hidden">
          <div className="bg-primary-700 text-white px-4 py-3 flex items-center gap-2">
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
