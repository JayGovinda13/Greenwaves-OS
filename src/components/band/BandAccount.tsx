'use client';
import { useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Download } from 'iconoir-react';
import { changePassword } from '@/app/(app)/configuracoes/actions';
import { exportMyData } from '@/app/(app)/configuracoes/lgpd-actions';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';

export function BandAccount() {
  const pwd = useFormAction(changePassword);
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h5" mb={2}>Minha conta</Typography>
      <Box component="form" onSubmit={pwd.submit} sx={{ display: 'grid', gap: 1.5, maxWidth: 360 }}>
        <TextField name="current" type="password" label="Senha atual" required autoComplete="current-password" />
        <TextField name="next" type="password" label="Nova senha" required autoComplete="new-password" {...pwd.err('next')} />
        <Button type="submit" variant="contained" disabled={pwd.pending} sx={{ justifySelf: 'start' }}>Alterar senha</Button>
      </Box>
      <Button
        sx={{ mt: 2 }}
        startIcon={<Download />}
        disabled={pending}
        onClick={() => start(async () => {
          const r = await exportMyData();
          if (r.ok && r.data) {
            const url = URL.createObjectURL(new Blob([r.data.json], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url; a.download = r.data.filename; a.click(); URL.revokeObjectURL(url);
          } else if (!r.ok) toast(r.error, 'error');
        })}
      >
        Baixar meus dados
      </Button>
    </Card>
  );
}
