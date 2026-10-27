import React from 'react';

/**
 * Logo único de VANESEV (G-036, «Obsidiana y ciruela»): monograma obsidiana con aro y «V» en champán,
 * y la palabra VANESEV en un solo color. Un solo logo para web, Central y admin.
 */
interface VanesevLogoProps {
  /** `claro`: sobre fondos porcelana. `oscuro`: sobre fondos obsidiana. */
  tono?: 'claro' | 'oscuro';
  /** Tamaño del monograma en px (la palabra escala con él). */
  tamano?: number;
  /** Muestra el lema «Tu marca. Tu agenda. Tus clientas.» (G-041) bajo la palabra (G-037: la dedicatoria es un guiño, no una declaración). */
  dedicatoria?: boolean;
  className?: string;
}

export const VanesevLogo: React.FC<VanesevLogoProps> = ({ tono = 'claro', tamano = 36, dedicatoria = true, className = '' }) => {
  const oscuro = tono === 'oscuro';
  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <span
        aria-hidden="true"
        className="relative shrink-0 rounded-full flex items-center justify-center font-lujo font-semibold"
        style={{
          width: tamano,
          height: tamano,
          fontSize: Math.round(tamano * 0.5),
          color: '#D9C49B',
          background: 'radial-gradient(circle at 30% 25%, #3A2442 0%, #1F1226 55%, #140B19 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(217,196,155,0.55), inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px -8px rgba(20,11,25,0.55)',
        }}
      >
        V
      </span>
      <span className="leading-none min-w-0">
        <span
          className="block font-lujo font-semibold truncate"
          style={{
            fontSize: Math.round(tamano * 0.56),
            letterSpacing: '0.16em',
            color: oscuro ? '#F4F1F6' : '#1A1020',
          }}
        >
          VANESEV
        </span>
        {dedicatoria && (
          <span
            className="block uppercase font-semibold truncate mt-1"
            style={{
              fontSize: Math.max(7, Math.round(tamano * 0.22)),
              letterSpacing: '0.14em',
              color: oscuro ? '#D9C49B' : '#7D6438',
            }}
          >
            Tu marca. Tu agenda. Tus clientas.
          </span>
        )}
      </span>
    </span>
  );
};
