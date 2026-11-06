import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { WaveMark } from '@/components/brand/WaveMark';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: FOREST_GRADIENT, color: BRAND.cream, textAlign: 'center', p: 3 }}>
      <Box>
        <Box sx={{ color: BRAND.lime, mb: 3, display: 'inline-flex' }}><WaveMark size={72} /></Box>
        <Typography variant="h1" sx={{ fontSize: 'clamp(3rem, 10vw, 7rem)' }}>404</Typography>
        <Typography sx={{ mt: 2, mb: 4, opacity: 0.85 }}>Essa página saiu em turnê e não voltou.</Typography>
        <Button component={Link} href="/dashboard" variant="contained" color="secondary" size="large">Voltar ao painel</Button>
      </Box>
    </Box>
  );
}
