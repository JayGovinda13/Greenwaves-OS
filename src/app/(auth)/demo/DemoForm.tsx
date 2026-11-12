'use client';
import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowLeft, Mail, ChatBubble } from 'iconoir-react';
import { WaveMark } from '@/components/brand/WaveMark';

const SIZES = ['1 a 3 artistas', '4 a 10 artistas', '11 a 25 artistas', 'Mais de 25 artistas'];

export function DemoForm({ whatsapp, email }: { whatsapp: string | null; email: string | null }) {
  const [v, setV] = useState({ name: '', company: '', city: '', contact: '', size: SIZES[1]!, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const text = () =>
    [
      'Olá! Quero agendar uma demonstração do Greenwaves OS.',
      '',
      `Nome: ${v.name}`,
      `Produtora: ${v.company}`,
      v.city && `Cidade: ${v.city}`,
      `Contato: ${v.contact}`,
      `Tamanho do casting: ${v.size}`,
      v.message && `\n${v.message}`,
    ]
      .filter(Boolean)
      .join('\n');

  const valid = () => {
    if (!v.name.trim() || !v.company.trim() || !v.contact.trim()) {
      setError('Preencha nome, produtora e um contato (e-mail ou WhatsApp).');
      return false;
    }
    if (!consent) {
      setError('Para enviarmos o pedido, confirme que concorda com o uso dos seus dados para o contato.');
      return false;
    }
    setError(null);
    return true;
  };

  const sendWhatsApp = () => {
    if (valid()) window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text())}`, '_blank', 'noopener');
  };
  const sendEmail = () => {
    if (valid())
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Demo Greenwaves OS — ${v.company}`)}&body=${encodeURIComponent(text())}`;
  };
  const noChannel = !whatsapp && !email;

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); if (whatsapp) sendWhatsApp(); else if (email) sendEmail(); }}>
      <Box sx={{ color: 'primary.main', mb: 3 }}>
        <WaveMark size={44} />
      </Box>
      <Typography variant="overline" color="text.secondary">Greenwaves OS para produtoras</Typography>
      <Typography variant="h3" sx={{ mb: 1 }}>Agende uma demo</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Agenda de shows, casting, contratantes e financeiro num lugar só. Conta pra gente sobre a sua produtora que a gente
        marca uma conversa.
      </Typography>
      <Stack spacing={2}>
        <TextField label="Seu nome" required value={v.name} onChange={set('name')} autoComplete="name" />
        <TextField label="Produtora / agência" required value={v.company} onChange={set('company')} autoComplete="organization" />
        <TextField label="Cidade" value={v.city} onChange={set('city')} />
        <TextField label="E-mail ou WhatsApp" required value={v.contact} onChange={set('contact')} />
        <TextField select label="Tamanho do casting" value={v.size} onChange={set('size')}>
          {SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField label="Quer contar algo mais? (opcional)" multiline minRows={2} value={v.message} onChange={set('message')} />
        <FormControlLabel
          control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
          label={
            <Typography variant="body2" color="text.secondary">
              Concordo que meus dados sejam usados só para responder este pedido de demonstração. Eles não ficam salvos no sistema.{' '}
              <Link href="/privacidade" target="_blank" style={{ color: 'inherit', fontWeight: 700 }}>Política de Privacidade</Link>
            </Typography>
          }
          sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {noChannel && <Alert severity="info">O agendamento de demos ainda não está disponível. Tente novamente em breve.</Alert>}
        {whatsapp && (
          <Button type="submit" variant="contained" size="large" startIcon={<ChatBubble />}>
            Agendar pelo WhatsApp
          </Button>
        )}
        {email && (
          <Button type={whatsapp ? 'button' : 'submit'} variant={whatsapp ? 'outlined' : 'contained'} size="large" startIcon={<Mail />} onClick={whatsapp ? sendEmail : undefined}>
            Agendar por e-mail
          </Button>
        )}
        <Typography variant="body2" color="text.secondary" textAlign="center">
          <Link href="/login" style={{ color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft width={16} /> Já tenho conta
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
