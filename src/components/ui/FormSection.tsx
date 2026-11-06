import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 3, '&:first-of-type': { mt: 1 } }}>
      <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)' }, gap: 2 }}>{children}</Box>
    </Box>
  );
}

/** Wrapper de grid: span = colunas (de 6) ocupadas em telas sm+ */
export function F({ span = 3, children }: { span?: 1 | 2 | 3 | 4 | 5 | 6; children: React.ReactNode }) {
  return <Box sx={{ gridColumn: { xs: 'span 1', sm: `span ${span}` } }}>{children}</Box>;
}
