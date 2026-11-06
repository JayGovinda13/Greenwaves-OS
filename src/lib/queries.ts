import 'server-only';
import { prisma } from './db';

export async function artistOptions(organizationId: string) {
  return prisma.artist.findMany({
    where: { organizationId },
    select: { id: true, name: true, slug: true, active: true },
    orderBy: { name: 'asc' },
  });
}
export type ArtistOption = Awaited<ReturnType<typeof artistOptions>>[number];

export async function contactOptions(organizationId: string) {
  return prisma.contact.findMany({
    where: { organizationId },
    select: { id: true, name: true, company: true, city: true, state: true },
    orderBy: { name: 'asc' },
  });
}
export type ContactOption = Awaited<ReturnType<typeof contactOptions>>[number];

export function checklistProgress(s: Record<string, unknown>): { done: number; total: number } {
  const keys = ['chkPoster', 'chkTickets', 'chkTechSheet', 'chkSocial', 'chkTravel', 'chkLodging', 'chkCrewList', 'chkGuests', 'chkSettled'];
  return { done: keys.filter((k) => s[k] === true).length, total: keys.length };
}
