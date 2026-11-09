import { DemoForm } from './DemoForm';

export const metadata = { title: 'Agende uma demo' };
export const dynamic = 'force-dynamic';

export default function DemoPage() {
  // Canais configurados por variável de ambiente (no Vercel: Settings → Environment Variables)
  const whatsapp = (process.env.DEMO_WHATSAPP ?? '').replace(/\D/g, '') || null;
  const email = process.env.DEMO_EMAIL?.trim() || null;
  return <DemoForm whatsapp={whatsapp} email={email} />;
}
