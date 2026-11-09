'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowRight } from 'iconoir-react';
import { login, type AuthState } from './actions';
import { WaveMark } from '@/components/brand/WaveMark';

export function AuthForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);
  return (
    <Box component="form" action={action}>
      <Box sx={{ color: 'primary.main', mb: 3 }}>
        <WaveMark size={44} />
      </Box>
      <Typography variant="overline" color="text.secondary">Bem-vindo de volta</Typography>
      <Typography variant="h3" sx={{ mb: 3 }}>Entrar</Typography>
      <Stack spacing={2}>
        <TextField name="email" type="email" label="E-mail" required autoComplete="email" defaultValue={state?.values?.email ?? ''} />
        <TextField name="password" type="password" label="Senha" required autoComplete="current-password" />
        {next && <input type="hidden" name="next" value={next} />}
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={pending} endIcon={<ArrowRight />}>
          {pending ? 'Aguarde…' : 'Entrar'}
        </Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Quer usar o Greenwaves OS na sua produtora?{' '}
          <Link href="/demo" style={{ color: 'inherit', fontWeight: 700 }}>Agende uma demo</Link>
        </Typography>
      </Stack>
    </Box>
  );
}
