import Box from '@mui/material/Box';
import { WaveMark } from './WaveMark';

/** Wordmark empilhado "GREEN / WAVE" na tipografia display expandida. */
export function Logo({ color = 'inherit', size = 1, withMark = false }: { color?: string; size?: number; withMark?: boolean }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 * size, color }}>
      {withMark && <WaveMark size={34 * size} />}
      <Box
        component="span"
        sx={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontStretch: '125%',
          textTransform: 'uppercase',
          lineHeight: 0.78,
          fontSize: `${1.18 * size}rem`,
          letterSpacing: '-0.02em',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span>Green</span>
        <span>Wave</span>
      </Box>
    </Box>
  );
}
