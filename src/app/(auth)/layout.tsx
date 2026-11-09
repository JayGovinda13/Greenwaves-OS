import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Logo } from '@/components/brand/Logo';
import { WaveMark } from '@/components/brand/WaveMark';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: BRAND.cream,
          background: FOREST_GRADIENT,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ borderTop: `1px solid ${BRAND.cream}55`, borderBottom: `1px solid ${BRAND.cream}55`, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo color={BRAND.cream} />
          <Typography sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 14 }}>Sistema de gestão</Typography>
        </Box>
        <Typography variant="h1" sx={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', textAlign: 'center', color: BRAND.cream }}>
          Making hardcore
          <br />
          great again
        </Typography>
        <Box sx={{ borderTop: `1px solid ${BRAND.cream}55`, pt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ textTransform: 'uppercase', fontSize: 14 }}>Um produto Greenwave, tirando onda e produzindo shows desde 2023</Typography>
          <Typography sx={{ textTransform: 'uppercase', fontSize: 14, color: BRAND.lime }}>Greenwaves OS</Typography>
        </Box>
        <Box sx={{ position: 'absolute', right: -60, bottom: 90, opacity: 0.12, color: BRAND.lime }}>
          <WaveMark size={340} strokeWidth={2.4} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 }, bgcolor: 'background.default' }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>{children}</Box>
      </Box>
    </Box>
  );
}
