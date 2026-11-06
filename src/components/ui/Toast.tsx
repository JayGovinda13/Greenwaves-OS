'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type Severity = 'success' | 'error' | 'info' | 'warning';
const ToastCtx = createContext<(msg: string, severity?: Severity) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; msg: string; severity: Severity; key: number }>({
    open: false, msg: '', severity: 'success', key: 0,
  });
  const toast = useCallback((msg: string, severity: Severity = 'success') => {
    setState((s) => ({ open: true, msg, severity, key: s.key + 1 }));
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <Snackbar
        key={state.key}
        open={state.open}
        autoHideDuration={4000}
        onClose={() => setState((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert variant="filled" severity={state.severity} sx={{ fontWeight: 600, borderRadius: 3 }}>
          {state.msg}
        </Alert>
      </Snackbar>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
