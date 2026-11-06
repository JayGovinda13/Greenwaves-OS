'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { saveShow } from '@/app/(app)/shows/actions';
import { BR_STATES, DEAL_TYPES, DEAL_TYPE_LABEL, SHOW_STATUS, SHOW_STATUS_LABEL } from '@/lib/domain';
import { moneyToInput, toInputDate } from '@/lib/format';
import { F, FormSection } from '@/components/ui/FormSection';
import { useFormAction } from '@/components/ui/useFormAction';

export interface ShowFormValues {
  id?: string;
  artistId?: string;
  contactId?: string | null;
  date?: Date | string;
  status?: string;
  city?: string | null;
  state?: string | null;
  venue?: string | null;
  eventName?: string | null;
  contactName?: string | null;
  dealType?: string;
  fee?: number | null;
  doorPercent?: number | null;
  dealNotes?: string | null;
  hospitality?: string | null;
  ticketUrl?: string | null;
  ticketsSold?: number | null;
  capacity?: number | null;
  ticketPrice?: number | null;
  posterUrl?: string | null;
  socialUrl?: string | null;
  techSheetUrl?: string | null;
  travel?: string | null;
  lodging?: string | null;
  crewList?: string | null;
  guestList?: string | null;
  notes?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: ShowFormValues;
  artists: { id: string; name: string }[];
  contacts: { id: string; name: string; company: string | null; city: string | null }[];
}

export function ShowFormDialog({ open, onClose, initial, artists, contacts }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const v = initial ?? {};
  const [dealType, setDealType] = useState(v.dealType ?? 'FIXED');
  const [contact, setContact] = useState(contacts.find((c) => c.id === v.contactId) ?? null);
  const { submit, pending, err } = useFormAction(
    (fd) => saveShow(v.id ?? null, fd),
    (data) => {
      onClose();
      if (!v.id && data?.id) router.push(`/shows/${data.id}`);
    },
  );
  const str = (x: string | null | undefined) => x ?? '';
  const num = (x: number | null | undefined) => (x === null || x === undefined ? '' : String(x));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
      <DialogTitle>{v.id ? 'Editar show' : 'Novo show'}</DialogTitle>
      <DialogContent dividers>
        <FormSection title="Geral">
          <F span={3}>
            <TextField select name="artistId" label="Artista" defaultValue={v.artistId ?? ''} required {...err('artistId')}>
              {artists.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}>
            <TextField type="date" name="date" label="Data" defaultValue={toInputDate(v.date)} required slotProps={{ inputLabel: { shrink: true } }} {...err('date')} />
          </F>
          <F span={1}>
            <TextField select name="status" label="Status" defaultValue={v.status ?? 'CONFIRMED'}>
              {SHOW_STATUS.map((s) => <MenuItem key={s} value={s}>{SHOW_STATUS_LABEL[s]}</MenuItem>)}
            </TextField>
          </F>
          <F span={3}><TextField name="venue" label="Local / casa" defaultValue={str(v.venue)} /></F>
          <F span={2}><TextField name="city" label="Cidade" defaultValue={str(v.city)} /></F>
          <F span={1}>
            <TextField select name="state" label="UF" defaultValue={v.state ?? ''}>
              <MenuItem value="">—</MenuItem>
              {BR_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </F>
          <F span={3}><TextField name="eventName" label="Evento / festival" defaultValue={str(v.eventName)} /></F>
          <F span={3}>
            <Autocomplete
              options={contacts}
              value={contact}
              onChange={(_, c) => setContact(c)}
              getOptionLabel={(c) => [c.name, c.company].filter(Boolean).join(' · ')}
              renderInput={(p) => <TextField {...p} label="Contratante (CRM)" />}
              size="small"
            />
            <input type="hidden" name="contactId" value={contact?.id ?? ''} />
          </F>
          <F span={6}><TextField name="contactName" label="Contato no dia (nome / telefone)" defaultValue={str(v.contactName)} /></F>
        </FormSection>

        <FormSection title="Combinado">
          <F span={2}>
            <TextField select name="dealType" label="Modelo" value={dealType} onChange={(e) => setDealType(e.target.value)}>
              {DEAL_TYPES.map((d) => <MenuItem key={d} value={d}>{DEAL_TYPE_LABEL[d]}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}>
            <TextField
              name="fee"
              label={dealType === 'GUARANTEE_OR_DOOR' ? 'Mínimo garantido' : 'Cachê'}
              defaultValue={moneyToInput(v.fee)}
              disabled={dealType === 'DOOR' || dealType === 'FREE'}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }}
              {...err('fee')}
            />
          </F>
          <F span={2}>
            <TextField
              name="doorPercent"
              label="% bilheteria"
              type="number"
              defaultValue={num(v.doorPercent)}
              disabled={dealType === 'FIXED' || dealType === 'FREE'}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { min: 0, max: 100 } }}
            />
          </F>
          <F span={3}><TextField name="hospitality" label="Contrapartidas (hospedagem, alimentação, backline…)" defaultValue={str(v.hospitality)} /></F>
          <F span={3}><TextField name="dealNotes" label="Combinado (texto livre)" defaultValue={str(v.dealNotes)} /></F>
        </FormSection>

        <FormSection title="Bilheteria e divulgação">
          <F span={3}><TextField name="ticketUrl" label="Link de ingressos" defaultValue={str(v.ticketUrl)} /></F>
          <F span={1}><TextField name="ticketsSold" type="number" label="Vendidos" defaultValue={num(v.ticketsSold)} /></F>
          <F span={1}><TextField name="capacity" type="number" label="Capacidade" defaultValue={num(v.capacity)} /></F>
          <F span={1}>
            <TextField name="ticketPrice" label="Ingresso" defaultValue={moneyToInput(v.ticketPrice)} slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }} />
          </F>
          <F span={3}><TextField name="posterUrl" label="Cartaz (link)" defaultValue={str(v.posterUrl)} /></F>
          <F span={3}><TextField name="socialUrl" label="Redes sociais (link)" defaultValue={str(v.socialUrl)} /></F>
        </FormSection>

        <FormSection title="Pré-produção e logística">
          <F span={6}><TextField name="techSheetUrl" label="Ficha técnica / caderno técnico (link)" defaultValue={str(v.techSheetUrl)} /></F>
          <F span={3}><TextField name="travel" label="Passagens" multiline minRows={2} defaultValue={str(v.travel)} /></F>
          <F span={3}><TextField name="lodging" label="Hospedagem" multiline minRows={2} defaultValue={str(v.lodging)} /></F>
          <F span={3}><TextField name="crewList" label="Lista de equipe" multiline minRows={2} defaultValue={str(v.crewList)} /></F>
          <F span={3}><TextField name="guestList" label="Lista de convidados" multiline minRows={2} defaultValue={str(v.guestList)} /></F>
          <F span={6}><TextField name="notes" label="Observações" multiline minRows={2} defaultValue={str(v.notes)} /></F>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={pending}>{pending ? 'Salvando…' : 'Salvar show'}</Button>
      </DialogActions>
    </Dialog>
  );
}
