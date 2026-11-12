// Criptografia de campos com dados pessoais de maior risco (RG, CPF) — LGPD art. 46.
// AES-256-GCM; a chave vem de DATA_ENCRYPTION_KEY (ou é derivada de AUTH_SECRET).
// Valores antigos em texto puro continuam legíveis e são cifrados na próxima gravação (ou pelo script lgpd:encrypt).
import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

function key(): Buffer {
  const base = process.env.DATA_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!base || base.length < 16) throw new Error('DATA_ENCRYPTION_KEY (ou AUTH_SECRET) ausente.');
  return crypto.createHash('sha256').update(`greenwaves-data:${base}`).digest();
}

export function isEncrypted(v: string | null | undefined): boolean {
  return !!v && v.startsWith(PREFIX);
}

export function encryptField(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (isEncrypted(v)) return v;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(v, 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), data]).toString('base64url');
}

export function decryptField(v: string | null | undefined): string | null {
  if (!v) return null;
  if (!isEncrypted(v)) return v; // legado em texto puro
  try {
    const raw = Buffer.from(v.slice(PREFIX.length), 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return null; // chave trocada ou dado corrompido: não expõe nada
  }
}

/** Máscara para exibição sem revelar o documento. */
export function maskDoc(v: string | null | undefined): string | null {
  const plain = decryptField(v);
  if (!plain) return null;
  const digits = plain.replace(/\W/g, '');
  return `•••••${digits.slice(-2)}`;
}
