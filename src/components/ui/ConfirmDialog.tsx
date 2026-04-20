import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger:  { icon: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', btn: 'bg-red-500 hover:bg-red-600 text-white' },
  warning: { icon: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', btn: 'bg-yellow-500 hover:bg-yellow-600 text-gray-900' },
  info:    { icon: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10', btn: 'bg-blue-500 hover:bg-blue-600 text-white' },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${styles.bg} border ${styles.border}`}>
              <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
            </div>
            <h3 className="text-white font-semibold text-base">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-gray-300 text-sm leading-relaxed mb-5">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles.btn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
