'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { MagicWand, Printer } from 'iconoir-react';
import { loadMolhoNegroExample } from '@/app/(app)/configuracoes/actions';
import { useToast } from '@/components/ui/Toast';

export function ExampleLoader() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ showIds: string[]; artistId: string } | null>(null);
  return (
    <Card sx={{ p: 3, gridColumn: '1 / -1' }}>
      <Typography variant="h5">Dados de teste</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5} maxWidth={760}>
        Carrega o exemplo <b>Molho Negro em Maringá (13/11) e Londrina (14/11)</b> com a ficha técnica completa (horários, cronograma, rider da casa,
        observações) e os ônibus de ida e volta. Pode ser usado mais de uma vez: atualiza em vez de duplicar.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<MagicWand />}
          disabled={pending}
          onClick={() => start(async () => {
            const r = await loadMolhoNegroExample();
            toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error');
            if (r.ok && r.data) setResult(r.data);
          })}
        >
          {pending ? 'Carregando…' : 'Carregar exemplo Molho Negro'}
        </Button>
      </Box>
      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography fontWeight={700} mb={1}>Pronto! Próximos passos:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" startIcon={<Printer />} href={`/imprimir/ficha-producao?shows=${result.showIds.join(',')}`} target="_blank">
              Ver a ficha técnica (2 shows)
            </Button>
            <Button size="small" variant="outlined" component={Link} href={`/shows/${result.showIds[0]}`}>Abrir o show de Maringá</Button>
            <Button size="small" variant="outlined" component={Link} href={`/artistas/${result.artistId}?aba=acesso`}>Dar acesso à banda</Button>
          </Box>
        </Alert>
      )}
    </Card>
  );
}
