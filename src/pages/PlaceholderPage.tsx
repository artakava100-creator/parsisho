import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800">{title}</h1>
        <p className="mt-2 text-neutral-500">{description}</p>
      </div>
      <EmptyState
        icon={icon}
        title="این بخش به‌زودی فعال می‌شود"
        description="ما در حال ساخت این بخش از شهر دیجیتال پارسیشو هستیم. به‌زودی اینجا خواهید بود."
        action={
          <Link to="/">
            <Button variant="outline">
              بازگشت به میدان شهر
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        }
      />
    </div>
  );
}
