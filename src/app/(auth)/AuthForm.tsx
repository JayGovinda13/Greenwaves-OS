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
import { login, signup, type AuthState } from './actions';
import { WaveMark } from '@/components/brand/WaveMark';

export function AuthForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'login' ? login : signup, undefined);
  const isLogin = mode === 'login';
  return (
    <Box component="form" action={action}>
      <Box sx={{ color: 'primary.main', mb: 3 }}>
        <WaveMark size={44} />
      </Box>
      <Typography variant="overline" color="text.secondary">
        {isLogin ? 'Bem-vindo de volta' : 'Comece agora'}
      </Typography>
      <Typography variant="h3" sx={{ mb: 3 }}>
        {isLogin ? 'Entrar' : 'Criar conta'}
      </Typography>
      <Stack spacing={2}>
        {!isLogin && <TextField name="name" label="Seu nome" required autoComplete="name" defaultValue={state?.values?.name ?? ''} />}
        {!isLogin && <TextField name="orgName" label="Nome da produtora" required placeholder="Green Wave" defaultValue={state?.values?.orgName ?? ''} />}
        <TextField name="email" type="email" label="E-mail" required autoComplete="email" defaultValue={state?.values?.email ?? ''} />
        <TextField
          name="password"
          type="password"
          label="Senha"
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          helperText={isLogin ? undefined : 'Mínimo de 8 caracteres'}
        />
        {next && <input type="hidden" name="next" value={next} />}
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={pending} endIcon={<ArrowRight />}>
          {pending ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar produtora'}
        </Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {isLogin ? (
            <>
              Nova produtora? <Link href="/cadastro" style={{ color: 'inherit', fontWeight: 700 }}>Crie sua conta</Link>
            </>
          ) : (
            <>
              Já tem conta? <Link href="/login" style={{ color: 'inherit', fontWeight: 700 }}>Entrar</Link>
            </>
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
