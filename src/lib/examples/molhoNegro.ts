// Exemplo de teste: Molho Negro em Maringá (13/11) e Londrina (14/11), a partir da ficha técnica real da Green Wave.
import type { Production } from '../production';

export const MN_EXAMPLE = {
  artistSlug: 'molho-negro',
  shows: [
    {
      date: '2026-11-13',
      city: 'Maringá',
      state: 'PR',
      venue: 'Tribos Bar',
      venueAddress: 'Av. Cerro Azul, 628 - Jardim Novo Horizonte, 87010-000',
      venueTechContact: null as string | null,
      production: {
        soundcheck: '18:30 – 20:00', doors: '21:00', showtime: '23:00', courtesies: '10',
        responsible: 'Arthur · (44) 9840-5794', promoter: 'Edwardes (Neto) · (44) 8818-8666',
        team: [
          { role: 'Produção', name: 'Carol Folha', phone: '(11) 97058-2617' },
          { role: 'Produção', name: 'Arnilha', phone: '(11) 98697-5379' },
          { role: 'Técnico de som', name: 'Paulo Leon', phone: '(11) 94835-4840' },
        ],
        rundown: [
          { start: '18:00', end: '18:30', label: 'Montagem', ours: false },
          { start: '18:30', end: '20:00', label: 'Soundcheck - Molho Negro', ours: true },
          { start: '20:00', end: '21:00', label: 'Soundcheck Fusage', ours: false },
          { start: '21:00', end: '', label: 'Abertura da casa', ours: false },
          { start: '23:00', end: '23:45', label: 'Showtime Fusagi', ours: false },
          { start: '00:00', end: '01:00', label: 'Showtime Molho Negro', ours: true },
          { start: '02:00', end: '', label: 'Encerramento', ours: false },
        ],
        notes: 'Consumação: O Tutu vai pedir 2 pizzas e colocar bebidas para a banda (coca e heineken zero), caso vocês precisem de algo mais específico pode solicitar direto com ele.',
        venueRider: {
          pa: 'Mesa de som Yamaha 01v96 32 canais', monitor: '3 monitores', mics: '2 mic sm58\n1 mic sm57',
          guitar: 'Peavey Valveking + Caixa 2x12\nLaney lv300 100w', bass: 'Meteoro 800mb + caixa 4x10', drums: 'Mapex com bumbo, 2 tons e surdo.', other: '', notes: '',
        },
      } satisfies Production,
    },
    {
      date: '2026-11-14',
      city: 'Londrina',
      state: 'PR',
      venue: 'Barbearia Londrina',
      venueAddress: 'R. Benjamin Constant, 1614 - Centro, 86020-320',
      venueTechContact: 'Kiko · (43) 9918-1838',
      production: {
        soundcheck: '18:30 – 20:00', doors: '20:00', showtime: '22:00', courtesies: '',
        responsible: 'Juninho · (43) 8806-9586', promoter: '',
        team: [],
        rundown: [
          { start: '18:30', end: '20:00', label: 'Soundcheck', ours: true },
          { start: '20:00', end: '', label: 'Abertura da casa', ours: false },
          { start: '22:00', end: '23:00', label: 'Showtime', ours: true },
          { start: '23:30', end: '', label: 'Saída para a Rodoviária', ours: false },
          { start: '23:50', end: '', label: 'Embarque pra São Paulo', ours: false },
        ],
        notes: 'Consumação: Juninho vai montar no apto dele do lado do Barbearia e liberar fichas pra vcs consumirem no bar.\n\nEle também vai levar a banda depois do show pra rodoviária. Atenção ao horário pra não perder o busão.',
        venueRider: {
          pa: 'Mesa de som: LS9', monitor: 'Dois monitores na frente (sem especificação dos modelos)', mics: 'Bateria microfonada nas peças, mas sem overheads',
          guitar: 'Marshall valvulado ma100 2x12', bass: 'Gallien Krueger 800RB + 1 caixa 4x10', drums: 'Tama Imperial Star 20", 10", 12", 14"', other: '',
          notes: 'A casa é pequena e a frente é aberta, então tem restrições de horário e volume. O Kiko, técnico de som da casa, reforçou que a estrutura é simples mas compatível com a casa.',
        },
      } satisfies Production,
    },
  ],
  legs: [
    { mode: 'BUS', direction: 'IDA', passengers: 'João, Paulo e Raony', company: 'Catarinense', code: '30792', origin: 'Barra Funda', destination: 'Maringá', date: '2026-11-12', departure: '22:30', arrival: '07:30', boarding: '22:00' },
    { mode: 'BUS', direction: 'VOLTA', passengers: 'João, Paulo e Raony', company: 'Catarinense', code: '36252', origin: 'Londrina', destination: 'Barra Funda', date: '2026-11-14', departure: '23:58', arrival: '07:40', boarding: '23:40' },
  ],
};
