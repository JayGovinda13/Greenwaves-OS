import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { WaveMark } from '@/components/brand/WaveMark';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
      <Box sx={{ color: 'primary.main', opacity: 0.5, mb: 2, display: 'inline-flex' }}>
        <WaveMark size={48} />
      </Box>
      <Typography variant="h5" color="text.primary">{title}</Typography>
      {description && <Typography sx={{ mt: 1, maxWidth: 420, mx: 'auto' }}>{description}</Typography>}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Box>
  );
}
