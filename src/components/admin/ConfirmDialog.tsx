import { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'تایید',
  cancelLabel = 'انصراف',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3">
        {variant === 'danger' && (
          <div className="w-10 h-10 rounded-full bg-error-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-error-600" />
          </div>
        )}
        <p className="text-sm text-neutral-600 leading-relaxed pt-2">{message}</p>
      </div>
      <div className="flex justify-start gap-2 mt-6">
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}

interface ConfirmDialogWrapProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialogWrap({
  open, onClose, onConfirm, title, children, confirmLabel, cancelLabel, variant, loading,
}: ConfirmDialogWrapProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="mb-4">{children}</div>
      <div className="flex justify-start gap-2">
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
          {confirmLabel ?? 'تایید'}
        </Button>
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel ?? 'انصراف'}
        </Button>
      </div>
    </Modal>
  );
}
