'use client';
import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { UserPlus } from 'iconoir-react';
import { inviteBandUser, removeBandUser } from '@/app/(app)/artistas/actions';
import { dayjs } from '@/lib/format';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useFormAction } from '@/components/ui/useFormAction';

export interface BandUser { membershipId: string; name: string; email: string; since: string }

export function BandAccessPanel({ artistId, artistName, users }: { artistId: string; artistName: string; users: BandUser[] }) {
  const [temp, setTemp] = useState<string | null>(null);
  const invite = useFormAction((fd) => inviteBandUser(artistId, fd), (d) => setTemp(d?.tempPassword ?? null));
  return (
    <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
      <Box>
        <Typography variant="h5">Portal da banda</Typography>
        <Typography color="text.secondary" mt={1}>
          Quem tem acesso entra no sistema e vê só a área do(a) {artistName}: próximos shows, horários, deslocamentos, ficha técnica, roadbook
          (sem valores) e o rider da banda, que pode manter atualizado. Não vê financeiro, contratantes nem outras bandas.
        </Typography>
        <Box component="form" onSubmit={invite.submit} sx={{ display: 'grid', gap: 1.5, mt: 2.5, maxWidth: 420 }}>
          <TextField name="name" label="Nome" required {...invite.err('name')} />
          <TextField name="email" type="email" label="E-mail" required {...invite.err('email')} />
          <Button type="submit" variant="contained" startIcon={<UserPlus />} disabled={invite.pending} sx={{ justifySelf: 'start' }}>Dar acesso</Button>
        </Box>
        {temp && (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setTemp(null)}>
            Senha temporária: <b>{temp}</b>. Envie junto com o endereço do sistema; ela aparece só agora. A pessoa pode trocá-la no portal.
          </Alert>
        )}
      </Box>
      <Box>
        <Typography variant="overline" color="primary.main">Quem tem acesso</Typography>
        {users.length === 0 && <Typography color="text.secondary" mt={1}>Ninguém ainda.</Typography>}
        {users.map((u) => (
          <Box key={u.membershipId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>{u.name}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{u.email} · desde {dayjs(u.since).format('DD/MM/YYYY')}</Typography>
            </Box>
            <ConfirmButton iconOnly label="Remover acesso" title={`Remover o acesso de ${u.name}?`} onConfirm={() => removeBandUser(artistId, u.membershipId)} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
