// Marca "onda" da Green Wave: quadrado arredondado com três linhas em onda.
export function WaveMark({ size = 32, color = 'currentColor', strokeWidth = 3.2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="3" y="3" width="42" height="42" rx="12" stroke={color} strokeWidth={strokeWidth} />
      {[17, 23.5, 30].map((y, i) => (
        <path
          key={i}
          d={`M3 ${y} H19 C26 ${y} 26 ${y - 6} 33 ${y - 6} H45`}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
