import { Shield, Truck, RefreshCw, Headphones } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'ضمانت اصالت',
    description: 'تمامی محصولات اصل و دارای گارانتی',
  },
  {
    icon: Truck,
    title: 'ارسال سریع',
    description: 'ارسال به سراسر ایران',
  },
  {
    icon: RefreshCw,
    title: 'هفت روز بازگشت',
    description: 'امکان بازگشت کالا تا هفت روز',
  },
  {
    icon: Headphones,
    title: 'پشتیبانی',
    description: 'پشتیبانی تا زمان دریافت کالا',
  },
];

export function TrustBanner() {
  return (
    <section className="rounded-2xl bg-neutral-50 border border-neutral-200/60 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex flex-col items-center text-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-800">{f.title}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{f.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
