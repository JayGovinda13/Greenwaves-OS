'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';
import { dayjs } from '@/lib/format';
import { artistColor } from '@/lib/colors';
import type { ShowRow } from './ShowsView';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function ShowsCalendar({ rows }: { rows: ShowRow[] }) {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const byDay = useMemo(() => {
    const m = new Map<string, ShowRow[]>();
    for (const r of rows) {
      const k = r.date.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return m;
  }, [rows]);

  const start = month.startOf('week');
  const days = Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <Card sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h4" sx={{ flex: 1, textTransform: 'uppercase' }}>{month.format('MMMM YYYY')}</Typography>
        <Button size="small" onClick={() => setMonth(dayjs().startOf('month'))}>Hoje</Button>
        <IconButton onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="Mês anterior"><NavArrowLeft /></IconButton>
        <IconButton onClick={() => setMonth(month.add(1, 'month'))} aria-label="Próximo mês"><NavArrowRight /></IconButton>
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: 0.75, minWidth: 780 }}>
          {WEEKDAYS.map((w) => (
            <Typography key={w} variant="overline" color="text.secondary" sx={{ px: 1 }}>{w}</Typography>
          ))}
          {days.map((d) => {
            const key = d.format('YYYY-MM-DD');
            const items = byDay.get(key) ?? [];
            const inMonth = d.month() === month.month();
            return (
              <Box
                key={key}
                sx={{
                  minHeight: 112, p: 0.75, borderRadius: 2.5, border: 1, borderColor: key === today ? 'secondary.dark' : 'divider',
                  bgcolor: inMonth ? 'background.paper' : 'transparent', opacity: inMonth ? 1 : 0.45,
                  boxShadow: key === today ? (t) => `inset 0 0 0 1px ${t.palette.secondary.dark}` : 'none',
                }}
              >
                <Typography fontSize={12} fontWeight={800} sx={{ px: 0.5, mb: 0.5, color: key === today ? 'primary.main' : 'text.secondary' }}>
                  {d.date()}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {items.map((s) => (
                    <Box
                      key={s.id}
                      component={Link}
                      href={`/shows/${s.id}`}
                      title={`${s.artist} — ${s.venue ?? ''} ${s.city ?? ''}`}
                      sx={{
                        display: 'block', textDecoration: 'none', color: '#fff', bgcolor: artistColor(s.artistSlug), borderRadius: 1.5, px: 0.75, py: 0.4,
                        fontSize: 11.5, lineHeight: 1.25, overflow: 'hidden', opacity: s.status === 'CANCELED' ? 0.45 : 1,
                        textDecorationLine: s.status === 'CANCELED' ? 'line-through' : 'none',
                      }}
                    >
                      <Box component="span" sx={{ fontWeight: 800, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.artist}</Box>
                      <Box component="span" sx={{ opacity: 0.9, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.city ?? s.venue ?? '—'}</Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Card>
  );
}
