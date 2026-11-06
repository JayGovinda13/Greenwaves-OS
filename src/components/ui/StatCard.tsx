import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { BRAND, FOREST_GRADIENT, LIME_GRADIENT } from '@/theme/brand';

type Tone = 'paper' | 'forest' | 'lime';

export function StatCard({ label, value, hint, icon, tone = 'paper' }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: Tone }) {
  const toned = tone !== 'paper';
  return (
    <Card
      sx={{
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...(tone === 'forest' && { background: FOREST_GRADIENT, color: BRAND.cream, borderColor: 'transparent' }),
        ...(tone === 'lime' && { background: LIME_GRADIENT, color: BRAND.ink, borderColor: 'transparent' }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="overline" sx={{ opacity: toned ? 0.85 : 1, color: toned ? 'inherit' : 'text.secondary', lineHeight: 1.4 }}>
          {label}
        </Typography>
        {icon && (
          <Box
            sx={{
              display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 2.5, flexShrink: 0,
              bgcolor: toned ? 'rgba(255,255,255,.14)' : 'action.hover', color: toned ? 'inherit' : 'primary.main',
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      <Typography variant="h3" component="div" sx={{ mt: 1, fontSize: { xs: '1.7rem', md: '2rem' } }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="body2" sx={{ mt: 0.75, opacity: toned ? 0.8 : 1, color: toned ? 'inherit' : 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Card>
  );
}
