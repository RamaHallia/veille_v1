import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../styles/design-tokens';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200';

    const variants = {
      default: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
      primary: 'bg-primary-100 text-primary-700 hover:bg-primary-200',
      success: 'bg-success-100 text-success-700 hover:bg-success-200',
      warning: 'bg-warning-100 text-warning-700 hover:bg-warning-200',
      danger: 'bg-danger-100 text-danger-700 hover:bg-danger-200',
      info: 'bg-info-100 text-info-700 hover:bg-info-200',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
