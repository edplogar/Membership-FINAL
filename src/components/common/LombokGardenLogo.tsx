import React from 'react';

interface LombokGardenLogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const LombokGardenLogo: React.FC<LombokGardenLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showText = true,
}) => {
  // Dimension scaling
  const dimensions = {
    sm: { icon: 34, textMain: 'text-sm', textSub: 'text-[9px]', gap: 'gap-2' },
    md: { icon: 46, textMain: 'text-base', textSub: 'text-[10px]', gap: 'gap-2.5' },
    lg: { icon: 68, textMain: 'text-xl', textSub: 'text-xs', gap: 'gap-3.5' },
    xl: { icon: 96, textMain: 'text-2xl', textSub: 'text-sm', gap: 'gap-4' },
  }[size];

  // Official Uploaded 3D Flower Emblem Image
  const OfficialFlowerEmblem = ({ sizePx }: { sizePx: number }) => (
    <img
      src="/lombok-garden-logo.svg"
      alt="Lombok Garden Hotel"
      width={sizePx}
      height={sizePx}
      className="shrink-0 object-contain drop-shadow-xs select-none"
      style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
      loading="eager"
    />
  );

  if (variant === 'icon' || !showText) {
    return (
      <div className={`inline-flex items-center justify-center bg-transparent ${className}`}>
        <OfficialFlowerEmblem sizePx={dimensions.icon} />
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center bg-transparent ${className}`}>
        <OfficialFlowerEmblem sizePx={dimensions.icon * 1.4} />
        <div className="mt-2">
          <div
            className={`font-black tracking-tight leading-none text-[#00A651] ${dimensions.textMain}`}
            style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Montserrat', sans-serif", letterSpacing: '0.04em' }}
          >
            LOMBOK GARDEN
          </div>
          <div
            className={`font-bold text-[#00A651] tracking-[0.5em] uppercase mt-1 leading-none ${dimensions.textSub}`}
            style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Montserrat', sans-serif" }}
          >
            HOTEL
          </div>
        </div>
      </div>
    );
  }

  // Default: Horizontal layout
  return (
    <div className={`inline-flex items-center bg-transparent ${dimensions.gap} ${className}`}>
      <OfficialFlowerEmblem sizePx={dimensions.icon} />
      <div className="flex flex-col text-left">
        <span
          className={`font-black text-[#00A651] tracking-tight leading-tight ${dimensions.textMain}`}
          style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Montserrat', sans-serif", letterSpacing: '0.02em' }}
        >
          LOMBOK GARDEN
        </span>
        <span
          className={`font-bold text-[#00A651] tracking-[0.44em] uppercase leading-none mt-0.5 ${dimensions.textSub}`}
          style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Montserrat', sans-serif" }}
        >
          HOTEL
        </span>
      </div>
    </div>
  );
};

