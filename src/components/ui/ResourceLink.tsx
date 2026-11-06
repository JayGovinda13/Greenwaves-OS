import Box from '@mui/material/Box';
import { Camera, Page, Link as LinkIcon, Instagram, Journal } from 'iconoir-react';
import { isUrl } from '@/lib/format';

const ICONS = { doc: Page, rider: Journal, photo: Camera, link: LinkIcon, instagram: Instagram } as const;

/** Pílula de material no estilo dos botões do portfólio ("Mídia kit", "Rider e mapa de palco"...). */
export function ResourceLink({ href, label, icon = 'link' }: { href: string | null | undefined; label: string; icon?: keyof typeof ICONS }) {
  const Icon = ICONS[icon];
  const enabled = isUrl(href);
  return (
    <Box
      component={enabled ? 'a' : 'span'}
      href={enabled ? href! : undefined}
      target="_blank"
      rel="noreferrer"
      title={enabled ? href! : 'Link não cadastrado'}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1, pl: 0.6, pr: 1.5, py: 0.6, borderRadius: 2,
        bgcolor: '#FFF7EA', color: '#17201C', fontWeight: 700, fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3,
        boxShadow: '0 2px 0 rgba(0,0,0,.18)', opacity: enabled ? 1 : 0.5, cursor: enabled ? 'pointer' : 'not-allowed',
        transition: 'transform .12s', '&:hover': enabled ? { transform: 'translateY(-1px)' } : undefined,
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 1.5, bgcolor: '#17201C', color: '#FFF7EA' }}>
        <Icon width={15} height={15} />
      </Box>
      {label}
    </Box>
  );
}
