import type { CSSProperties } from 'react';

interface SymProps {
  name: string;
  size?: number;
  fill?: 0 | 1; // 0 = outlined (big category tiles), 1 = filled (cards, facets)
  weight?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

// A single Material Symbols Rounded glyph. The font is loaded in index.html;
// FILL/wght/opsz are driven through font-variation-settings so one font file
// covers both the outlined tiles and the filled media/facet icons.
export function Sym({ name, size = 20, fill = 1, weight = 500, color, className, style }: SymProps) {
  return (
    <span
      aria-hidden="true"
      className={`msr${className ? ` ${className}` : ''}`}
      style={{
        fontSize: size,
        color,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'opsz' 48`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
