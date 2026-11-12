// Dados legais da plataforma (operadora). Configure no Vercel: Settings → Environment Variables.
export function platformLegal() {
  return {
    name: process.env.PLATFORM_LEGAL_NAME || 'Greenwaves OS',
    document: process.env.PLATFORM_CNPJ || null,
    privacyEmail: process.env.PRIVACY_EMAIL || process.env.DEMO_EMAIL || null,
    dpoName: process.env.PLATFORM_DPO_NAME || null,
    updatedAt: '12/11/2026',
  };
}

/** Prazos de retenção aplicados pelo sistema (LGPD art. 15 e 16). */
export const RETENTION = {
  activityMonths: 24,
  mcpLogDays: 180,
  loginAttemptDays: 30,
};
