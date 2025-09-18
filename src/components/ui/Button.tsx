import React, { ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary-500 text-secondary-900 hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/30',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600',
    accent: 'bg-accent-blue-500 text-white hover:bg-accent-blue-600',
    outline: 'border border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-secondary-900 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/30',
    ghost: 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-all duration-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/30',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
