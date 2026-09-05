import { useState } from 'react';
import { Headset, X, Send } from 'lucide-react';

export function SupportButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      {/* Floating button with rotating glow */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="fixed bottom-20 sm:bottom-24 lg:bottom-6 right-3 sm:right-4 lg:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-700 text-white shadow-lg hover:bg-primary-600 hover:shadow-xl transition-all group support-glow-ring"
        aria-label="پشتیبانی آنلاین"
      >
        {panelOpen
          ? <X className="w-6 h-6 mx-auto" />
          : <Headset className="w-6 h-6 mx-auto group-hover:scale-110 transition-transform" />
        }
      </button>

      {/* Support panel */}
      {panelOpen && (
        <div className="fixed bottom-[6.5rem] sm:bottom-[7rem] lg:bottom-[5.5rem] right-3 sm:right-4 lg:right-6 z-40 w-[calc(100vw-1.5rem)] sm:w-[300px] sm:w-[340px] bg-white rounded-xl sm:rounded-2xl shadow-lg border border-neutral-200 animate-scale-in overflow-hidden">
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
