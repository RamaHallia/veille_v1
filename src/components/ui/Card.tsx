import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../styles/design-tokens';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-white rounded-2xl border border-neutral-200 transition-all duration-300';

    const variants = {
      default: 'shadow-md',
      interactive: 'shadow-md hover:shadow-xl hover:border-primary-300 cursor-pointer active:scale-[0.98]',
      gradient: 'shadow-xl border-0 bg-gradient-to-br from-primary-50 to-secondary-50',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverEffect = hover ? 'hover:shadow-xl hover:-translate-y-1' : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverEffect,
          'animate-fadeInUp',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
