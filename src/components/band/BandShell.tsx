'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { LogOut } from 'iconoir-react';
import { Logo } from '@/components/brand/Logo';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';
import { initials } from '@/lib/format';
import { logout } from '@/app/(auth)/actions';

export function BandShell({ userName, artistName, orgName, children }: { userName: string; artistName: string; orgName: string; children: React.ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [, start] = useTransition();
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ background: FOREST_GRADIENT, color: BRAND.cream, px: { xs: 2, md: 4 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Logo color={BRAND.cream} size={0.85} />
        <Box sx={{ borderLeft: `1px solid ${BRAND.cream}44`, pl: 2 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: BRAND.lime, fontWeight: 800 }}>Portal da banda</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{artistName} · {orgName}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box component="button" onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)} sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', p: 0 }} aria-label="Conta">
          <Avatar sx={{ bgcolor: BRAND.lime, color: BRAND.ink, fontWeight: 800, width: 36, height: 36, fontSize: 14 }}>{initials(userName)}</Avatar>
        </Box>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <Box sx={{ px: 2, py: 1 }}><Typography fontWeight={700}>{userName}</Typography></Box>
          <MenuItem component={Link} href="/privacidade" target="_blank" onClick={() => setAnchor(null)}>Privacidade</MenuItem>
          <MenuItem onClick={() => start(() => logout())}><ListItemIcon><LogOut /></ListItemIcon>Sair</MenuItem>
        </Menu>
      </Box>
      <Box component="main" sx={{ maxWidth: 1180, mx: 'auto', p: { xs: 2, md: 4 } }}>{children}</Box>
    </Box>
  );
}
