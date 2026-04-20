import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';

interface QuickAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface QuickActionsProps {
  actions?: QuickAction[]; // Make optional
  mainAction?: QuickAction; // Primary FAB action
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

/**
 * QuickActions - Floating action buttons for mobile
 * Features:
 * - Context-aware actions
 * - Smooth animations
 * - Primary FAB + secondary actions
 */
const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  mainAction,
  position = 'bottom-right',
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-24 right-4',
    'bottom-left': 'bottom-24 left-4',
    'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 flex flex-col items-end space-y-3 safe-area-bottom`}>
      {/* Secondary Actions */}
      {actions && actions.length > 0 && (
        <div className="flex flex-col space-y-2">
          {actions.map((action) => {
            const Icon = action.icon || Plus;
            return (
              <Button
                key={action.id}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={action.onClick}
                className="min-h-[48px] min-w-[48px] rounded-full shadow-lg"
                title={action.label}
              >
                <Icon className="w-5 h-5" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Primary FAB */}
      {mainAction && (
        <Button
          variant="primary"
          size="lg"
          onClick={mainAction.onClick}
          className="min-h-[56px] min-w-[56px] rounded-full shadow-xl"
          title={mainAction.label}
        >
          {mainAction.icon ? (
            <mainAction.icon className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </Button>
      )}
    </div>
  );
};

export default QuickActions;

