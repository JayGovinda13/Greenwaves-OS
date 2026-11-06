'use client';
import Button from '@mui/material/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title="Deu ruim por aqui"
      description="Algo inesperado aconteceu ao carregar esta página."
      action={<Button variant="contained" onClick={reset}>Tentar novamente</Button>}
    />
  );
}
