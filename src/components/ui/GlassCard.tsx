import { forwardRef, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          'bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-2xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard';
