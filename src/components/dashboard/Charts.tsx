'use client';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { useIsDark } from '@/components/ui/useIsDark';
import { BRAND } from '@/theme/brand';

export function ShowsPerMonthChart({ data, currentMonth }: { data: { month: string; shows: number }[]; currentMonth: number }) {
  const dark = useIsDark();
  return (
    <BarChart
      height={260}
      dataset={data}
      xAxis={[{
        scaleType: 'band', dataKey: 'month', tickLabelStyle: { textTransform: 'capitalize' },
        colorMap: { type: 'ordinal', values: data.map((d) => d.month), colors: data.map((_, i) => (i === currentMonth ? (dark ? '#FFF7EA' : BRAND.lime) : dark ? BRAND.lime : BRAND.green)) },
      }]}
      yAxis={[{ width: 28, tickMinStep: 1 }]}
      series={[{ dataKey: 'shows', label: 'Shows' }]}
      borderRadius={6}
      grid={{ horizontal: true }}
      hideLegend
      margin={{ left: 0, right: 8, top: 16, bottom: 0 }}
    />
  );
}

const REGION_COLORS = [BRAND.green, BRAND.lime, '#D9822B', '#2D6A8E', '#B5487A'];

export function RegionChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <PieChart
      height={260}
      series={[{
        data: data.map((d, i) => ({ id: d.label, label: d.label, value: d.value, color: REGION_COLORS[i] })),
        innerRadius: 58, outerRadius: 100, paddingAngle: 2, cornerRadius: 6,
        highlightScope: { fade: 'global', highlight: 'item' },
      }]}
      slotProps={{ legend: { direction: 'vertical', position: { vertical: 'middle', horizontal: 'end' } } }}
    />
  );
}
