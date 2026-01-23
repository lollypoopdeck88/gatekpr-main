import { cn } from '@/lib/utils';

interface GateKprLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
}

export function GateKprLogo({ className, size = 'md', variant = 'mark' }: GateKprLogoProps) {
  const sizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn(sizes[size], 'relative flex-shrink-0', className)}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background rounded square */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="10"
          className="fill-secondary"
        />
        
        {/* Gate frame - left pillar */}
        <rect x="11" y="10" width="4" height="28" rx="2" className="fill-white" />
        {/* Gate frame - right pillar */}
        <rect x="33" y="10" width="4" height="28" rx="2" className="fill-white" />
        {/* Gate frame - top bar */}
        <rect x="11" y="10" width="26" height="4" rx="2" className="fill-white" />
        
        {/* Gate doors - left door */}
        <rect x="17" y="16" width="6" height="22" rx="1" className="fill-white opacity-70" />
        {/* Gate doors - right door */}
        <rect x="25" y="16" width="6" height="22" rx="1" className="fill-white opacity-70" />
      </svg>
    </div>
  );
}

export function GateKprLogoFull({ className, size = 'md' }: Omit<GateKprLogoProps, 'variant'>) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <GateKprLogo size={size} />
      <span className={cn(
        'font-bold text-foreground',
        size === 'sm' && 'text-lg',
        size === 'md' && 'text-xl',
        size === 'lg' && 'text-2xl',
      )}>
        GateKpr
      </span>
    </div>
  );
}
