'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import {
  Calendar, Community, HalfMoon, TaskList, HomeSimple, LogOut, Menu as MenuIcon, MusicDoubleNote, Settings, SunLight, Wallet, Check,
} from 'iconoir-react';
import { Logo } from '@/components/brand/Logo';
import { WaveMark } from '@/components/brand/WaveMark';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';
import { initials } from '@/lib/format';
import { ROLE_LABEL, type Role } from '@/lib/domain';
import { logout, switchOrganization } from '@/app/(auth)/actions';
import { TasksDrawer } from '@/components/tasks/TasksDrawer';

const DRAWER = 256;

const NAV = [
  { href: '/dashboard', label: 'Painel', icon: HomeSimple },
  { href: '/shows', label: 'Agenda de shows', icon: Calendar },
  { href: '/artistas', label: 'Casting', icon: MusicDoubleNote },
  { href: '/contatos', label: 'Contratantes', icon: Community },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface Props {
  user: { name: string; email: string };
  org: { id: string; name: string; plan: string };
  role: Role;
  orgs: { id: string; name: string; role: Role }[];
  openTasks: number;
  children: React.ReactNode;
}

function Sidebar({ org, onNavigate }: { org: Props['org']; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: FOREST_GRADIENT, color: BRAND.cream }}>
      <Box sx={{ px: 3, pt: 3.5, pb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo color={BRAND.cream} size={1.05} />
        <Box sx={{ color: BRAND.lime, opacity: 0.9 }}>
          <WaveMark size={30} strokeWidth={3} />
        </Box>
      </Box>
      <Box sx={{ mx: 3, mb: 2, borderTop: `1px solid ${BRAND.cream}33` }} />
      <Typography sx={{ px: 3, mb: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND.lime }}>
        {org.name}
      </Typography>
      <Box component="nav" sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Box
              key={href}
              component={Link}
              href={href}
              onClick={onNavigate}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.75,
                py: 1.2,
                borderRadius: 999,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
                color: active ? BRAND.ink : BRAND.cream,
                bgcolor: active ? BRAND.lime : 'transparent',
                transition: 'background-color .15s, color .15s',
                '&:hover': { bgcolor: active ? BRAND.lime : `${BRAND.cream}14` },
              }}
            >
              <Icon width={20} height={20} />
              {label}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ m: 2, p: 2, borderRadius: 4, border: `1px solid ${BRAND.cream}26`, bgcolor: `${BRAND.forestDeep}66` }}>
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStretch: '125%', textTransform: 'uppercase', fontSize: 13, lineHeight: 1.1 }}>
          Fazendo rock doido desde 2023
        </Typography>
        <Typography sx={{ fontSize: 12, opacity: 0.7, mt: 0.5 }}>Plano {org.plan} · Greenwaves OS</Typography>
      </Box>
    </Box>
  );
}

function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;
  if (!resolved) return <Box sx={{ width: 40 }} />;
  return (
    <Tooltip title={resolved === 'dark' ? 'Modo claro' : 'Modo escuro'}>
      <IconButton onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}>
        {resolved === 'dark' ? <SunLight /> : <HalfMoon />}
      </IconButton>
    </Tooltip>
  );
}

export function AppShell({ user, org, role, orgs, openTasks, children }: Props) {
  const [tasksOpen, setTasksOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Box component="aside" sx={{ width: { lg: DRAWER }, flexShrink: 0 }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: DRAWER, border: 0 } }}
        >
          <Sidebar org={org} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: DRAWER, border: 0 } }}
        >
          <Sidebar org={org} />
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <MenuIcon />
            </IconButton>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Tarefas">
              <IconButton onClick={() => setTasksOpen(true)} aria-label="Tarefas">
                <Badge badgeContent={openTasks} color="secondary" max={99} sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
                  <TaskList />
                </Badge>
              </IconButton>
            </Tooltip>
            <ColorModeToggle />
            <Box
              component="button"
              onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25, border: 0, bgcolor: 'transparent', cursor: 'pointer',
                color: 'inherit', p: 0.5, pr: 1.5, borderRadius: 999, '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 800, fontSize: 14 }}>
                {initials(user.name)}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{user.name}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.2 }}>{ROLE_LABEL[role]}</Typography>
              </Box>
            </Box>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography fontWeight={700}>{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              </Box>
              {orgs.length > 1 && <Divider />}
              {orgs.length > 1 &&
                orgs.map((o) => (
                  <MenuItem key={o.id} disabled={pending} onClick={() => startTransition(() => switchOrganization(o.id))}>
                    <ListItemIcon>{o.id === org.id ? <Check /> : null}</ListItemIcon>
                    {o.name}
                  </MenuItem>
                ))}
              <Divider />
              <MenuItem component={Link} href="/configuracoes" onClick={() => setAnchor(null)}>
                <ListItemIcon><Settings /></ListItemIcon>
                Configurações
              </MenuItem>
              <MenuItem onClick={() => startTransition(() => logout())}>
                <ListItemIcon><LogOut /></ListItemIcon>
                Sair
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <TasksDrawer open={tasksOpen} onClose={() => setTasksOpen(false)} />
        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1480, width: '100%', mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
