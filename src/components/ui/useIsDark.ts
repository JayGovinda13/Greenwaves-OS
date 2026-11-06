'use client';
import { useColorScheme } from '@mui/material/styles';

/** Com cssVariables, theme.palette.mode não muda em runtime; lemos o esquema ativo. */
export function useIsDark(): boolean {
  const { mode, systemMode } = useColorScheme();
  return (mode === 'system' ? systemMode : mode) === 'dark';
}
