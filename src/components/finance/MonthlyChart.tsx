'use client';
import { BarChart } from '@mui/x-charts/BarChart';
import { useIsDark } from '@/components/ui/useIsDark';
import { BRAND } from '@/theme/brand';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function MonthlyChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const dark = useIsDark();
  return (
    <BarChart
      height={280}
      dataset={data}
      xAxis={[{ scaleType: 'band', dataKey: 'month', tickLabelStyle: { textTransform: 'capitalize' } }]}
      yAxis={[{ valueFormatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)), width: 44 }]}
      series={[
        { dataKey: 'income', label: 'Receitas', color: dark ? BRAND.lime : BRAND.green, valueFormatter: (v) => brl.format(v ?? 0) },
        { dataKey: 'expense', label: 'Despesas', color: '#D9822B', valueFormatter: (v) => brl.format(v ?? 0) },
      ]}
      borderRadius={6}
      grid={{ horizontal: true }}
      margin={{ left: 0, right: 8, top: 16, bottom: 0 }}
    />
  );
}
