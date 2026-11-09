// Recebível automático do show: mantém um lançamento de receita (source = SHOW_FEE)
// sincronizado com o cachê, a forma de pagamento e o status do show.
import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

interface ShowForReceivable {
  id: string;
  organizationId: string;
  artistId: string;
  date: Date;
  status: string;
  dealType: string;
  fee: number | null;
  paymentTerms: string;
  paymentDueDate: Date | null;
  venue: string | null;
  city: string | null;
}

/** Data de vencimento do cachê: dia do show (no ato) ou a data combinada. */
export function receivableDueDate(show: Pick<ShowForReceivable, 'date' | 'paymentTerms' | 'paymentDueDate'>): Date {
  return show.paymentTerms === 'SCHEDULED' && show.paymentDueDate ? show.paymentDueDate : show.date;
}

/** Cachê gera recebível quando há valor garantido (fixo ou mínimo). % de bilheteria pura é lançado no fechamento. */
export function hasGuaranteedFee(show: Pick<ShowForReceivable, 'dealType' | 'fee'>): boolean {
  return !!show.fee && show.fee > 0 && show.dealType !== 'DOOR';
}

export async function syncShowReceivable(db: Db, show: ShowForReceivable, artistName: string) {
  const existing = await db.transaction.findFirst({ where: { showId: show.id, source: 'SHOW_FEE' } });

  if (!hasGuaranteedFee(show)) {
    // Sem valor garantido: remove o recebível automático ainda não pago
    if (existing && existing.status !== 'PAID') await db.transaction.delete({ where: { id: existing.id } });
    return;
  }

  const dueDate = receivableDueDate(show);
  const description = `Cachê ${artistName} — ${show.venue ?? show.city ?? 'show'}`;
  const canceled = show.status === 'CANCELED';

  if (!existing) {
    if (canceled) return;
    await db.transaction.create({
      data: {
        organizationId: show.organizationId,
        showId: show.id,
        artistId: show.artistId,
        type: 'INCOME',
        category: 'FEE',
        source: 'SHOW_FEE',
        description,
        amount: show.fee!,
        date: show.date,
        dueDate,
        status: 'PENDING',
        notes: show.dealType === 'GUARANTEE_OR_DOOR' ? 'Valor mínimo garantido; ajuste no fechamento se a bilheteria superar.' : null,
      },
    });
    return;
  }

  if (existing.status === 'PAID') return; // pago: preserva o histórico
  await db.transaction.update({
    where: { id: existing.id },
    data: {
      description,
      amount: show.fee!,
      date: show.date,
      dueDate,
      artistId: show.artistId,
      status: canceled ? 'CANCELED' : 'PENDING',
    },
  });
}

/** Situação de um recebível para exibição. */
export function receivableState(tx: { status: string; dueDate: Date | string | null; date: Date | string; paidAt?: Date | string | null }, now = new Date()) {
  if (tx.status === 'PAID') {
    const due = new Date(tx.dueDate ?? tx.date);
    const late = tx.paidAt ? new Date(tx.paidAt).getTime() > due.getTime() + 24 * 3600 * 1000 : false;
    return late ? 'PAID_LATE' : 'PAID';
  }
  if (tx.status === 'CANCELED') return 'CANCELED';
  const due = new Date(tx.dueDate ?? tx.date);
  const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  return due < today ? 'OVERDUE' : 'PENDING';
}
