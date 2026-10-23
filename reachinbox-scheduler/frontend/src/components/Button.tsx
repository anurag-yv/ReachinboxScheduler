import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-chocolate-700 text-white hover:bg-chocolate-800 focus:ring-chocolate-600 shadow-chocolate-900/15',
    secondary:
      'bg-chocolate-50 text-chocolate-800 hover:bg-chocolate-100 focus:ring-chocolate-400 border border-chocolate-200',
    outline:
      'bg-white text-chocolate-900 hover:bg-chocolate-50 border border-chocolate-300 focus:ring-chocolate-500',
    danger:
      'bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-500 shadow-rose-100',
    ghost:
      'bg-transparent text-chocolate-700 hover:bg-chocolate-50 hover:text-chocolate-900 shadow-none focus:ring-chocolate-300',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="inline-flex">{icon}</span>
      )}
      {children}
    </button>
  );
};
