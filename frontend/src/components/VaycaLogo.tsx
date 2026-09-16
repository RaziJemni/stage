import React from 'react';

interface VaycaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
}

const sizeMap = {
  sm: { box: 28, radius: 6, stroke: 3, dot: 3.5 },
  md: { box: 38, radius: 9, stroke: 3.5, dot: 4.5 },
  lg: { box: 48, radius: 11, stroke: 4.5, dot: 5.5 },
  xl: { box: 64, radius: 14, stroke: 6, dot: 7 },
};

export const VaycaLogo: React.FC<VaycaLogoProps> = ({
  size = 'md',
  className = '',
  showWordmark = false,
  subtitle = 'Tunisia Property Ops',
}) => {
  const { box, stroke, dot } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Geometric Monogram Tile */}
      <div
        style={{ width: box, height: box }}
        className="relative shrink-0 rounded-[22%] bg-[#0F3D5E] shadow-[0_2px_8px_rgba(15,61,94,0.28)] flex items-center justify-center overflow-hidden"
      >
        <svg
          viewBox="0 0 40 40"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Geometric V Monogram */}
          <path
            d="M10 12 L20 29 L30 12"
            stroke="#FFFFFF"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Signature Terracotta Accent Dot */}
          <circle cx="31" cy="9.5" r={dot} fill="#D96B43" />
        </svg>
      </div>

      {/* Optional Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-[#1C1B18] tracking-tight leading-none">
              Vayca
            </span>
            <span className="text-[10px] font-bold tracking-wider text-[#D96B43] bg-[#FDF4F0] px-1.5 py-0.5 rounded border border-[#FBE6DC]">
              TN
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-[#78716C] mt-0.5 font-medium leading-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
