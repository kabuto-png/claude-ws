'use client';

interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 64, className = '' }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main body */}
      <rect x="16" y="20" width="32" height="24" className="fill-foreground" />

      {/* Ears/horns */}
      <rect x="12" y="24" width="4" height="12" className="fill-foreground" />
      <rect x="48" y="24" width="4" height="12" className="fill-foreground" />

      {/* Legs */}
      <rect x="20" y="44" width="4" height="8" className="fill-foreground" />
      <rect x="28" y="44" width="4" height="8" className="fill-foreground" />
      <rect x="36" y="44" width="4" height="8" className="fill-foreground" />
      <rect x="44" y="44" width="4" height="8" className="fill-foreground" />

      {/* Eyes */}
      <rect x="24" y="28" width="4" height="4" className="fill-background" />
      <rect x="36" y="28" width="4" height="4" className="fill-background" />

      {/* Mouth */}
      <rect x="28" y="36" width="8" height="2" className="fill-background" />

      {/* Kanban board lines on body */}
      <rect x="22" y="20" width="2" height="24" className="fill-background opacity-20" />
      <rect x="40" y="20" width="2" height="24" className="fill-background opacity-20" />
    </svg>
  );
}

interface LogoProps {
  showIcon?: boolean;
  iconSize?: number;
  className?: string;
}

export function Logo({ showIcon = true, iconSize = 24, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <LogoIcon size={iconSize} />}
      <span
        className="font-mono text-base font-bold tracking-tight"
        style={{
          fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
          letterSpacing: '-0.02em'
        }}
      >
        <span className="text-foreground">CLAUDE</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-foreground">KANBAN</span>
      </span>
    </div>
  );
}
