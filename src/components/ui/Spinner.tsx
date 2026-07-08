import { twMerge } from 'tailwind-merge';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 8, className = '' }: SpinnerProps) {
  return (
    <div
      className={twMerge(
        `w-${size} h-${size}`,
        'border-4 border-purple-500 border-t-transparent rounded-full animate-spin',
        className
      )}
    />
  );
}
