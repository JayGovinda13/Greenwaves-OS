'use client';
import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Copy, RefreshDouble, Trash } from 'iconoir-react';
import { STAGE_ITEM_LABEL, STAGE_ITEM_SIZE, STAGE_ITEM_TYPES, newId, type StageItem, type StageItemType } from '@/lib/techRider';

const W = 1000;
const H = 600;
const INK = '#17201C';
const FOREST = '#1C5A44';
const LIME = '#C9E13E';
const CREAM = '#FFFDF8';

/** Desenho de cada tipo de item, centrado em (0,0). */
function Shape({ type, selected }: { type: StageItemType; selected?: boolean }) {
  const [w, h] = STAGE_ITEM_SIZE[type];
  const stroke = selected ? '#D9822B' : INK;
  const sw = selected ? 4 : 2.5;
  switch (type) {
    case 'DRUMS':
      return (
        <g stroke={stroke} strokeWidth={sw} fill={CREAM}>
          <circle cx={0} cy={18} r={34} fill="#E8E2D2" />
          <circle cx={-48} cy={-12} r={20} />
          <circle cx={-12} cy={-36} r={17} />
          <circle cx={26} cy={-36} r={17} />
          <circle cx={58} cy={10} r={24} />
          <circle cx={-70} cy={-48} r={18} fill="none" strokeDasharray="4 3" />
          <circle cx={68} cy={-50} r={20} fill="none" strokeDasharray="4 3" />
          <circle cx={0} cy={66} r={9} fill={INK} />
        </g>
      );
    case 'GUITAR_AMP':
    case 'BASS_AMP':
      return (
        <g stroke={stroke} strokeWidth={sw}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={type === 'BASS_AMP' ? '#D7E6DD' : '#EDE7D8'} />
          <line x1={-w / 2 + 8} y1={h / 2 - 10} x2={w / 2 - 8} y2={h / 2 - 10} />
        </g>
      );
    case 'KEYS':
      return (
        <g stroke={stroke} strokeWidth={sw}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={CREAM} />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={-w / 2 + (w / 10) * (i + 1)} y1={-h / 2} x2={-w / 2 + (w / 10) * (i + 1)} y2={h / 2} strokeWidth={1.2} />
          ))}
        </g>
      );
    case 'VOCAL':
      return (
        <g stroke={stroke} strokeWidth={sw}>
          <circle r={18} fill={CREAM} />
          <line x1={-12} y1={-12} x2={12} y2={12} />
          <line x1={-12} y1={12} x2={12} y2={-12} />
        </g>
      );
    case 'WEDGE':
      return <polygon points={`${-w / 2},${-h / 2} ${w / 2},${-h / 2} ${w / 2 - 12},${h / 2} ${-w / 2 + 12},${h / 2}`} fill={LIME} stroke={stroke} strokeWidth={sw} />;
    case 'IEM':
      return (
        <g stroke={stroke} strokeWidth={sw} fill={LIME}>
          <circle r={18} />
          <text y={6} textAnchor="middle" fontSize={16} fontWeight={800} fill={INK} stroke="none">IEM</text>
        </g>
      );
    case 'SIDEFILL':
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={LIME} stroke={stroke} strokeWidth={sw} />;
    case 'DI':
      return (
        <g stroke={stroke} strokeWidth={sw}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={CREAM} />
          <text y={6} textAnchor="middle" fontSize={14} fontWeight={800} fill={INK} stroke="none">DI</text>
        </g>
      );
    case 'POWER':
      return (
        <g stroke={stroke} strokeWidth={sw}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill="#FFE27A" />
          <path d="M3 -13 L-7 3 L1 3 L-3 14 L8 -3 L0 -3 Z" fill={INK} stroke="none" />
        </g>
      );
    case 'RISER':
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="#F1ECDF" stroke={stroke} strokeWidth={sw} strokeDasharray="10 6" />;
    case 'PEDALBOARD':
      return (
        <g stroke={stroke} strokeWidth={sw}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="#DDD6C6" />
          {[-24, 0, 24].map((x) => <circle key={x} cx={x} cy={0} r={6} fill={CREAM} />)}
        </g>
      );
    case 'TEXT':
    default:
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill="transparent" stroke={selected ? stroke : 'transparent'} strokeWidth={sw} strokeDasharray="4 4" />;
  }
}

/** Desenha o mapa de palco. Com `onChange`, vira editor (arrastar, girar, renomear, duplicar, remover). */
export function StagePlot({ items, onChange, height }: { items: StageItem[]; onChange?: (items: StageItem[]) => void; height?: number | string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const editable = !!onChange;
  const sel = items.find((i) => i.id === selected) ?? null;

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const update = (id: string, patch: Partial<StageItem>) => onChange?.(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const clamp = (v: number, max: number) => Math.max(10, Math.min(max - 10, Math.round(v)));

  const add = (type: StageItemType) => {
    const it: StageItem = { id: newId(), type, x: W / 2 + (Math.random() * 80 - 40), y: H / 2 + (Math.random() * 60 - 30), rot: 0, label: type === 'TEXT' ? 'Texto' : '' };
    // praticável fica por baixo dos demais itens
    onChange?.(type === 'RISER' ? [it, ...items] : [...items, it]);
    setSelected(it.id);
  };

  return (
    <Box>
      {editable && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          {STAGE_ITEM_TYPES.map((t) => (
            <Button key={t} size="small" variant="outlined" onClick={() => add(t)} sx={{ borderRadius: 2, px: 1.25, py: 0.25, fontSize: 12.5, display: 'inline-flex', gap: 0.75 }}>
              <svg width={22} height={18} viewBox={`${-STAGE_ITEM_SIZE[t][0] / 2 - 6} ${-STAGE_ITEM_SIZE[t][1] / 2 - 6} ${STAGE_ITEM_SIZE[t][0] + 12} ${STAGE_ITEM_SIZE[t][1] + 12}`}>
                <Shape type={t} />
              </svg>
              {STAGE_ITEM_LABEL[t]}
            </Button>
          ))}
        </Box>
      )}

      <Box sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden', bgcolor: CREAM }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', width: '100%', height: height ?? 'auto', touchAction: editable ? 'none' : 'auto', userSelect: 'none' }}
          onPointerDown={(e) => { if (e.target === svgRef.current || (e.target as Element).getAttribute('data-bg')) setSelected(null); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = toSvg(e);
            update(drag.current.id, { x: clamp(p.x - drag.current.dx, W), y: clamp(p.y - drag.current.dy, H) });
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerLeave={() => { drag.current = null; }}
        >
          <defs>
            <pattern id="gw-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E6E0D2" strokeWidth="1" />
            </pattern>
          </defs>
          <rect data-bg="1" x={0} y={0} width={W} height={H} fill="url(#gw-grid)" />
          <rect data-bg="1" x={20} y={30} width={W - 40} height={H - 80} fill="none" stroke={FOREST} strokeWidth={3} rx={10} />
          <text x={W / 2} y={22} textAnchor="middle" fontSize={15} fontWeight={800} fill={FOREST} letterSpacing="3">FUNDO DO PALCO</text>
          <rect x={20} y={H - 42} width={W - 40} height={34} fill={FOREST} rx={8} />
          <text x={W / 2} y={H - 19} textAnchor="middle" fontSize={15} fontWeight={800} fill={CREAM} letterSpacing="3">FRENTE DO PALCO · PLATEIA</text>

          {items.map((it) => {
            const [, h] = STAGE_ITEM_SIZE[it.type];
            const isSel = editable && it.id === selected;
            return (
              <g
                key={it.id}
                transform={`translate(${it.x} ${it.y})`}
                style={{ cursor: editable ? 'grab' : 'default' }}
                onPointerDown={(e) => {
                  if (!editable) return;
                  e.stopPropagation();
                  (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
                  const p = toSvg(e);
                  drag.current = { id: it.id, dx: p.x - it.x, dy: p.y - it.y };
                  setSelected(it.id);
                }}
              >
                <g transform={`rotate(${it.rot})`}>
                  <Shape type={it.type} selected={isSel} />
                </g>
                {it.label && (
                  <text
                    y={it.type === 'TEXT' ? 6 : h / 2 + 20}
                    textAnchor="middle"
                    fontSize={it.type === 'TEXT' ? 20 : 16}
                    fontWeight={800}
                    fill={INK}
                    stroke={CREAM}
                    strokeWidth={4}
                    paintOrder="stroke"
                  >
                    {it.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>

      {editable && (
        <Box sx={{ mt: 1.5, minHeight: 48, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {sel ? (
            <>
              <Typography fontWeight={700} sx={{ mr: 1 }}>{STAGE_ITEM_LABEL[sel.type]}</Typography>
              <TextField
                label="Nome no mapa"
                value={sel.label}
                onChange={(e) => update(sel.id, { label: e.target.value.slice(0, 60) })}
                sx={{ width: 220 }}
                fullWidth={false}
                placeholder="Ex.: Guitarra 1 (Marshall)"
              />
              <Tooltip title="Girar 45°"><IconButton onClick={() => update(sel.id, { rot: (sel.rot + 45) % 360 })}><RefreshDouble /></IconButton></Tooltip>
              <Tooltip title="Duplicar">
                <IconButton onClick={() => { const c = { ...sel, id: newId(), x: Math.min(W - 20, sel.x + 40), y: Math.min(H - 20, sel.y + 30) }; onChange!([...items, c]); setSelected(c.id); }}>
                  <Copy />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remover"><IconButton color="error" onClick={() => { onChange!(items.filter((i) => i.id !== sel.id)); setSelected(null); }}><Trash /></IconButton></Tooltip>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Clique num item acima para adicioná-lo. Arraste para posicionar; clique num item do palco para renomear, girar, duplicar ou remover.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
