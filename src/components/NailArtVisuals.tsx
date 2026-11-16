import { useState } from 'react';
import type { NailShape } from '../types/studio';

export function BrandCrestImage({
  className = '',
  alt = 'Love Those Nails by Eshin studio emblem',
}: {
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-[#D2AAAB] flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
      >
        <span className="font-sans font-bold tracking-[0.08em] text-[#141212] text-2xl sm:text-3xl uppercase">
          LOVE THOSE NAILS
        </span>
        <span className="font-['Playfair_Display'] text-[#141212] text-base sm:text-lg tracking-[0.14em] uppercase mt-1 self-end mr-4">
          BY ESHIN
        </span>
      </div>
    );
  }

  return (
    <img
      src="/assets/aistudio/image_30e4633f.png"
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`bg-[#D2AAAB] block object-contain brightness-[0.982] ${className}`}
    />
  );
}

const SHAPE_PATHS: Record<NailShape, { nail: string; tip: string; highlight: string }> = {
  Almond: {
    nail: 'M 42 150 C 42 105, 44 62, 62 32 C 72 16, 88 16, 98 32 C 116 62, 118 105, 118 150 C 118 168, 102 180, 80 180 C 58 180, 42 168, 42 150 Z',
    tip: 'M 47 72 C 58 58, 102 58, 113 72 C 108 52, 103 40, 98 32 C 88 16, 72 16, 62 32 C 57 40, 52 52, 47 72 Z',
    highlight: 'M 60 56 C 58 84, 58 118, 60 144',
  },
  Coffin: {
    nail: 'M 42 150 L 45 78 L 58 24 C 59 21, 62 20, 65 20 L 95 20 C 98 20, 101 21, 102 24 L 115 78 L 118 150 C 118 168, 102 180, 80 180 C 58 180, 42 168, 42 150 Z',
    tip: 'M 48 64 C 66 56, 94 56, 112 64 L 102 24 C 101 21, 98 20, 95 20 L 65 20 C 62 20, 59 21, 58 24 Z',
    highlight: 'M 62 42 L 58 144',
  },
  Oval: {
    nail: 'M 42 150 L 42 82 C 42 46, 57 26, 80 26 C 103 26, 118 46, 118 82 L 118 150 C 118 168, 102 180, 80 180 C 58 180, 42 168, 42 150 Z',
    tip: 'M 43 74 C 60 62, 100 62, 117 74 C 115 44, 101 26, 80 26 C 59 26, 45 44, 43 74 Z',
    highlight: 'M 58 54 C 56 84, 56 116, 58 144',
  },
  Square: {
    nail: 'M 42 150 L 43 32 C 43 26, 48 22, 54 22 L 106 22 C 112 22, 117 26, 117 32 L 118 150 C 118 168, 102 180, 80 180 C 58 180, 42 168, 42 150 Z',
    tip: 'M 43 60 C 64 52, 96 52, 117 60 L 117 32 C 117 26, 112 22, 106 22 L 54 22 C 48 22, 43 26, 43 32 Z',
    highlight: 'M 58 40 L 58 144',
  },
  Stiletto: {
    nail: 'M 42 150 C 42 105, 48 64, 74 18 C 77 12, 83 12, 86 18 C 112 64, 118 105, 118 150 C 118 168, 102 180, 80 180 C 58 180, 42 168, 42 150 Z',
    tip: 'M 50 74 C 66 64, 94 64, 110 74 C 102 48, 92 29, 86 18 C 83 12, 77 12, 74 18 C 68 29, 58 48, 50 74 Z',
    highlight: 'M 64 52 C 60 84, 58 118, 59 144',
  },
};

export function NailShapePreview({
  shape,
  shadeHex,
  finish,
}: {
  shape: NailShape;
  shadeHex: string;
  finish: 'Glossy' | 'Pearl Chrome' | 'French Tip';
}) {
  const geo = SHAPE_PATHS[shape];
  const baseFill = finish === 'French Tip' ? '#F3EAE6' : shadeHex;
  const frenchTipFill = shadeHex === '#F3ECE8' ? '#FFFFFF' : shadeHex;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 160 220"
        className="w-40 h-56 drop-shadow-[0_14px_26px_rgba(20,18,18,0.08)]"
        aria-label={`${shape} nail preview in ${finish}`}
      >
        <defs>
          <linearGradient id="chromeSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.48" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#141212" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="fingerTone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EEDCD5" />
            <stop offset="100%" stopColor="#E1C7BE" />
          </linearGradient>
        </defs>

        {/* Finger silhouette */}
        <path
          d="M 28 220 L 28 134 C 28 96, 46 74, 80 74 C 114 74, 132 96, 132 134 L 132 220 Z"
          fill="url(#fingerTone)"
        />
        {/* Cuticle shadow */}
        <path
          d="M 40 152 C 40 172, 58 184, 80 184 C 102 184, 120 172, 120 152"
          fill="none"
          stroke="#C8A99E"
          strokeWidth="2.5"
        />

        {/* Nail plate */}
        <path
          d={geo.nail}
          fill={baseFill}
          stroke="rgba(20,18,18,0.12)"
          strokeWidth="1.2"
        />

        {/* French tip */}
        {finish === 'French Tip' && (
          <path d={geo.tip} fill={frenchTipFill} opacity="0.95" />
        )}

        {/* Pearl chrome glaze overlay */}
        {finish === 'Pearl Chrome' && (
          <path d={geo.nail} fill="url(#chromeSheen)" />
        )}

        {/* Studio lamp specular highlight */}
        <path
          d={geo.highlight}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity={finish === 'Pearl Chrome' ? '0.68' : '0.45'}
        />
      </svg>
    </div>
  );
}
