import { Logo } from '@/components/brand/Logo';
import { WaveMark } from '@/components/brand/WaveMark';

const FOREST_BG =
  'radial-gradient(120% 90% at 85% 0%, #2F7A5B 0%, #1C5A44 38%, #0F3B2C 72%, #0A2A1F 100%)';

export function SheetHeader({ kind, title, subtitle, right }: { kind: string; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div style={{ background: FOREST_BG, color: '#FFF7EA', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -24, bottom: -34, opacity: 0.18, color: '#C9E13E' }}>
        <WaveMark size={150} strokeWidth={2.4} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,247,234,.3)', paddingBottom: 8 }}>
        <Logo color="#FFF7EA" size={0.8} />
        <span style={{ fontSize: 11, letterSpacing: '.14em', fontWeight: 800, color: '#C9E13E' }}>{kind}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 12, position: 'relative' }}>
        <div>
          <div className="gw-display" style={{ fontSize: title.length > 16 ? 30 : 38 }}>{title}</div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.92 }}>{subtitle}</div>
        </div>
        {right}
      </div>
    </div>
  );
}
