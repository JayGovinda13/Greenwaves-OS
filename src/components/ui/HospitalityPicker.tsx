'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { Check } from 'iconoir-react';
import { HOSPITALITY, HOSPITALITY_LABEL, type Hospitality } from '@/lib/domain';

/** Seleção múltipla de contrapartidas em chips. Envia os códigos (separados por vírgula) no campo `name`. */
export function HospitalityPicker({ name, value, onChange }: { name: string; value: Hospitality[]; onChange: (v: Hospitality[]) => void }) {
  const toggle = (h: Hospitality) => onChange(value.includes(h) ? value.filter((x) => x !== h) : HOSPITALITY.filter((x) => x === h || value.includes(x)));
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {HOSPITALITY.map((h) => {
        const on = value.includes(h);
        return (
          <Chip
            key={h}
            label={HOSPITALITY_LABEL[h]}
            icon={on ? <Check width={16} /> : undefined}
            color={on ? 'primary' : 'default'}
            variant={on ? 'filled' : 'outlined'}
            onClick={() => toggle(h)}
            aria-pressed={on}
          />
        );
      })}
      <input type="hidden" name={name} value={value.join(',')} />
    </Box>
  );
}
