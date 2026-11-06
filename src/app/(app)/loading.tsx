import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export default function Loading() {
  return (
    <Box>
      <Skeleton width={140} height={20} />
      <Skeleton width={360} height={56} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: 4 }} />)}
      </Box>
      <Skeleton variant="rounded" height={360} sx={{ borderRadius: 4 }} />
    </Box>
  );
}
