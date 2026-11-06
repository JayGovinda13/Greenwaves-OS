'use client';
import { createTheme, alpha } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { BRAND } from './brand';

const display = 'var(--font-display), "Archivo", system-ui, sans-serif';
const body = 'var(--font-body), "DM Sans", system-ui, sans-serif';

const displayVariant = {
  fontFamily: display,
  fontWeight: 900,
  fontStretch: '125%',
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.01em',
  lineHeight: 0.95,
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: BRAND.green, dark: BRAND.forest, light: BRAND.greenLight, contrastText: BRAND.cream },
        secondary: { main: BRAND.lime, dark: BRAND.limeDeep, contrastText: BRAND.ink },
        success: { main: '#2E8B57' },
        warning: { main: '#D98E04' },
        error: { main: '#C2412D' },
        info: { main: '#2D6A8E' },
        background: { default: BRAND.sand, paper: '#FFFCF5' },
        text: { primary: BRAND.ink, secondary: alpha(BRAND.ink, 0.66) },
        divider: alpha(BRAND.forest, 0.12),
      },
    },
    dark: {
      palette: {
        primary: { main: BRAND.lime, dark: BRAND.limeDeep, light: '#DDF07A', contrastText: BRAND.forest },
        secondary: { main: BRAND.cream, contrastText: BRAND.forest },
        success: { main: '#5FCB8A' },
        warning: { main: '#F2B441' },
        error: { main: '#F07A62' },
        info: { main: '#7DB8DA' },
        background: { default: '#08201A', paper: '#0E2C23' },
        text: { primary: BRAND.cream, secondary: alpha(BRAND.cream, 0.68) },
        divider: alpha(BRAND.cream, 0.1),
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: body,
    h1: { ...displayVariant, fontSize: '3.4rem' },
    h2: { ...displayVariant, fontSize: '2.6rem' },
    h3: { ...displayVariant, fontSize: '2rem' },
    h4: { ...displayVariant, fontSize: '1.55rem' },
    h5: { ...displayVariant, fontSize: '1.2rem', lineHeight: 1.05 },
    h6: { fontFamily: body, fontWeight: 700, fontSize: '1rem' },
    overline: { fontFamily: body, fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.7rem' },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
    subtitle2: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased' },
        '::selection': { background: BRAND.lime, color: BRAND.ink },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 18 },
        sizeSmall: { paddingInline: 12 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 18 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700, borderRadius: 8 }, sizeSmall: { height: 22, fontSize: '0.72rem' } },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiDialogTitle: { styleOverrides: { root: { ...displayVariant, fontSize: '1.3rem', paddingTop: 22 } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontWeight: 600, borderRadius: 8 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, minHeight: 44 } } },
    MuiDataGrid: {
      styleOverrides: {
        root: { border: 'none', '--DataGrid-containerBackground': 'transparent' },
        columnHeaderTitle: { fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' },
        cell: { display: 'flex', alignItems: 'center' },
      },
    },
  },
});
