'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { saveArtist } from '@/app/(app)/artistas/actions';
import { BR_STATES, DEFAULT_HOSPITALITY_LOCAL, DEFAULT_HOSPITALITY_TRAVEL, parseHospitality, type Hospitality } from '@/lib/domain';
import { HospitalityPicker } from '@/components/ui/HospitalityPicker';
import { moneyToInput } from '@/lib/format';
import { F, FormSection } from '@/components/ui/FormSection';
import { useFormAction } from '@/components/ui/useFormAction';

export interface ArtistFormValues {
  id?: string;
  name?: string;
  instagram?: string | null;
  originCity?: string | null;
  originState?: string | null;
  genres?: string | null;
  bio?: string | null;
  latestRelease?: string | null;
  label?: string | null;
  mediaKitUrl?: string | null;
  riderUrl?: string | null;
  photosUrl?: string | null;
  settlementUrl?: string | null;
  baseFee?: number | null;
  coverImageUrl?: string | null;
  hospitalityLocal?: string | null;
  hospitalityTravel?: string | null;
  accent?: string;
  active?: boolean;
}

export function ArtistFormDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: ArtistFormValues }) {
  const router = useRouter();
  const v = initial ?? {};
  const { submit, pending, err } = useFormAction(
    (fd) => saveArtist(v.id ?? null, fd),
    (data) => {
      onClose();
      if (!v.id && data?.id) router.push(`/artistas/${data.id}`);
    },
  );
  const s = (x: string | null | undefined) => x ?? '';
  const initLocal = parseHospitality(v.hospitalityLocal).items;
  const initTravel = parseHospitality(v.hospitalityTravel).items;
  const [local, setLocal] = useState<Hospitality[]>(initLocal.length ? initLocal : DEFAULT_HOSPITALITY_LOCAL);
  const [travel, setTravel] = useState<Hospitality[]>(initTravel.length ? initTravel : DEFAULT_HOSPITALITY_TRAVEL);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
      <DialogTitle>{v.id ? 'Editar artista' : 'Novo artista'}</DialogTitle>
      <DialogContent dividers>
        <FormSection title="Identidade">
          <F span={3}><TextField name="name" label="Nome" required defaultValue={s(v.name)} {...err('name')} /></F>
          <F span={3}><TextField name="instagram" label="Instagram" placeholder="@banda" defaultValue={s(v.instagram)} /></F>
          <F span={2}><TextField name="originCity" label="Cidade de origem" defaultValue={s(v.originCity)} /></F>
          <F span={1}>
            <TextField select name="originState" label="UF" defaultValue={v.originState ?? ''}>
              <MenuItem value="">—</MenuItem>
              {BR_STATES.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
          </F>
          <F span={3}><TextField name="genres" label="Gêneros (separados por vírgula)" defaultValue={s(v.genres)} /></F>
          <F span={3}><TextField name="latestRelease" label="Último lançamento" defaultValue={s(v.latestRelease)} /></F>
          <F span={2}><TextField name="label" label="Selo" defaultValue={s(v.label)} /></F>
          <F span={1}>
            <TextField select name="accent" label="Cor do card" defaultValue={v.accent ?? 'green'}>
              <MenuItem value="green">Verde</MenuItem>
              <MenuItem value="lime">Lime</MenuItem>
              <MenuItem value="cream">Creme</MenuItem>
            </TextField>
          </F>
          <F span={6}><TextField name="bio" label="Release / bio" multiline minRows={4} defaultValue={s(v.bio)} /></F>
        </FormSection>
        <FormSection title="Materiais e comercial">
          <F span={3}><TextField name="mediaKitUrl" label="Mídia kit (link)" defaultValue={s(v.mediaKitUrl)} /></F>
          <F span={3}><TextField name="riderUrl" label="Rider e mapa de palco (link)" defaultValue={s(v.riderUrl)} /></F>
          <F span={3}><TextField name="photosUrl" label="Fotos de divulgação (link)" defaultValue={s(v.photosUrl)} /></F>
          <F span={3}><TextField name="settlementUrl" label="Planilha de fechamento (link)" defaultValue={s(v.settlementUrl)} /></F>
          <F span={6}><TextField name="coverImageUrl" label="Foto da capa da ficha técnica (link direto da imagem .jpg/.png)" defaultValue={s(v.coverImageUrl)} /></F>
          <F span={2}>
            <TextField name="baseFee" label="Cachê de referência" defaultValue={moneyToInput(v.baseFee)} slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }} />
          </F>
          <F span={2}>
            <TextField select name="active" label="Situação" defaultValue={v.active === false ? 'false' : 'true'}>
              <MenuItem value="true">No casting</MenuItem>
              <MenuItem value="false">Inativo</MenuItem>
            </TextField>
          </F>
        </FormSection>
        <FormSection title="Contrapartidas padrão">
          <F span={6}>
            <Typography variant="body2" color="text.secondary">
              Usadas para pré-preencher o formulário de cada show, conforme a UF do show em relação à UF de origem do artista.
            </Typography>
          </F>
          <F span={6}>
            <Typography fontWeight={700} mb={1}>Show na própria UF</Typography>
            <HospitalityPicker name="hospitalityLocal" value={local} onChange={setLocal} />
          </F>
          <F span={6}>
            <Typography fontWeight={700} mb={1}>Show em outra UF (viagem)</Typography>
            <HospitalityPicker name="hospitalityTravel" value={travel} onChange={setTravel} />
          </F>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={pending}>{pending ? 'Salvando…' : 'Salvar'}</Button>
      </DialogActions>
    </Dialog>
  );
}
