import { requireContext } from '@/lib/tenant';
import { PRINT_CSS } from '@/components/print/printStyles';

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireContext();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="gw-print">{children}</div>
    </>
  );
}
