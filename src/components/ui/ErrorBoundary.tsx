import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-error-50 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-error-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral-800 mb-2">
              مشکلی پیش آمده است
            </h2>
            <p className="text-neutral-500 mb-6 leading-relaxed">
              یک خطای غیرمنتظره رخ داد. لطفاً صفحه را تازه‌سازی کنید یا دوباره تلاش کنید.
            </p>
            <Button onClick={this.handleReset} variant="outline">
              تلاش مجدد
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
