'use client';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { IconoirProvider } from 'iconoir-react';
import { theme } from '@/theme/theme';
import { ToastProvider } from './ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'gw' }}>
      <ThemeProvider theme={theme} defaultMode="light">
        <CssBaseline enableColorScheme />
        <IconoirProvider iconProps={{ strokeWidth: 1.8, width: '1.25em', height: '1.25em' }}>
          <ToastProvider>{children}</ToastProvider>
        </IconoirProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
