import React from 'react';
import { Mail, LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Mail,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-chocolate-200">
      <div className="w-12 h-12 rounded-full bg-chocolate-50 flex items-center justify-center mb-4 text-chocolate-600 border border-chocolate-100">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-chocolate-950 mb-1">{title}</h4>
      <p className="text-xs text-chocolate-600 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
