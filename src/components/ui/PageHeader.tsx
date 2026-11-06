import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function PageHeader({ overline, title, subtitle, actions }: { overline?: string; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 3.5 }}>
      <Box sx={{ minWidth: 0 }}>
        {overline && (
          <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>
            {overline}
          </Typography>
        )}
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  );
}
