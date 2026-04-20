import React, { ReactNode, useEffect, useRef } from 'react';
import Button from '../ui/Button';

interface MobileFormProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitButtonFixed?: boolean;
}

/**
 * MobileForm - Form wrapper with mobile optimizations
 * Features:
 * - Large inputs
 * - Keyboard-aware scrolling
 * - Submit button fixed at bottom (optional)
 * - Proper spacing for mobile
 */
const MobileForm: React.FC<MobileFormProps> = ({
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  submitButtonFixed = true,
}) => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Scroll to first input on focus (keyboard-aware)
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay for keyboard animation
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4 pb-24">
      {/* Form Content */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Fixed Action Buttons */}
      {submitButtonFixed && (
        <div className="fixed bottom-20 left-0 right-0 z-40 bg-gray-800 border-t border-gray-700 p-4 safe-area-bottom">
          <div className="flex space-x-3 max-w-md mx-auto">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 min-h-[48px]"
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 min-h-[48px]"
            >
              {isSubmitting ? 'Submitting...' : submitLabel}
            </Button>
          </div>
        </div>
      )}

      {/* Non-fixed Action Buttons (fallback) */}
      {!submitButtonFixed && (
        <div className="flex space-x-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 min-h-[48px]"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1 min-h-[48px]"
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default MobileForm;

