// Modelo de planilha para importação ("Modelo de importação - Greenwaves OS.xlsx").
// Os cabeçalhos aqui precisam bater com os parsers de greenwave-xlsx.ts.
import ExcelJS from 'exceljs';
import { BR_STATES } from '../domain';

const FOREST = 'FF0F3B2C';
const LIME = 'FFC9E13E';
const CREAM = 'FFFFF7EA';
const INK = 'FF17201C';
const ROWS = 300; // linhas com validação/formatação

interface Col {
  header: string;
  width: number;
  note?: string;
  list?: 'artists' | 'states';
  date?: boolean;
}

function sheet(wb: ExcelJS.Workbook, name: string, title: string, cols: Col[], tab = FOREST) {
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: { argb: tab } },
    views: [{ state: 'frozen', ySplit: 2, xSplit: 1 }],
  });
  ws.columns = cols.map((c) => ({ width: c.width }));

  // Linha 1: faixa de título no verde-limão
  ws.mergeCells(1, 1, 1, cols.length);
  const t = ws.getCell(1, 1);
  t.value = `GREEN WAVE · ${title}`;
  t.font = { name: 'Arial Black', size: 14, bold: true, color: { argb: INK } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIME } };
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 30;

  // Linha 2: cabeçalhos no verde floresta
  const h = ws.getRow(2);
  cols.forEach((c, i) => {
    const cell = h.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: CREAM }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FOREST } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    if (c.note) cell.note = c.note;
  });
  h.height = 24;
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: cols.length } };

  return ws;
}

function validate(ws: ExcelJS.Worksheet, cols: Col[], artistCount: number) {
  cols.forEach((c, i) => {
    for (let r = 3; r < 3 + ROWS; r++) {
      const cell = ws.getCell(r, i + 1);
      if (c.date) {
        cell.numFmt = 'dd/mm/yyyy';
        cell.dataValidation = {
          type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date('2000-01-01')],
          showErrorMessage: true, errorTitle: 'Data inválida', error: 'Use o formato dd/mm/aaaa.',
        };
      } else if (c.list === 'states') {
        cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`Listas!$B$2:$B$${BR_STATES.length + 1}`] };
      } else if (c.list === 'artists' && artistCount > 0) {
        // showErrorMessage false: permite digitar um artista novo
        cell.dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`Listas!$A$2:$A$${artistCount + 1}`] };
      }
    }
  });
}

const ARTIST_COLS: Col[] = [
  { header: 'Nome', width: 26, note: 'Nome do artista. Se já existir no sistema, os campos preenchidos atualizam o cadastro.' },
  { header: 'Instagram', width: 20, note: 'Ex.: @budang__' },
  { header: 'Cidade', width: 18 },
  { header: 'UF', width: 7, list: 'states' },
  { header: 'Gêneros', width: 26, note: 'Separados por vírgula. Ex.: Hardcore, Punk' },
  { header: 'Último lançamento', width: 22 },
  { header: 'Selo', width: 14 },
  { header: 'Release', width: 60, note: 'Texto de apresentação (bio) do artista.' },
  { header: 'Mídia kit', width: 28, note: 'Link (Drive, Dropbox…)' },
  { header: 'Rider e mapa de palco', width: 28, note: 'Link' },
  { header: 'Fotos de divulgação', width: 28, note: 'Link' },
  { header: 'Cachê de referência', width: 18, note: 'Em reais. Ex.: 2.500' },
];

const SHOW_COLS: Col[] = [
  { header: 'Data', width: 13, date: true, note: 'Obrigatório. dd/mm/aaaa' },
  { header: 'Banda', width: 22, list: 'artists', note: 'Obrigatório. Escolha da lista ou digite um artista novo.' },
  { header: 'Cidade', width: 20, note: 'Pode incluir a UF: "João Pessoa - PB"' },
  { header: 'Local', width: 26, note: 'Casa de show / festival' },
  { header: 'Contato', width: 24, note: 'Nome e telefone. Ex.: Gordo, 45 9800-5777' },
  { header: 'Cartazes', width: 22, note: 'Link do cartaz' },
  { header: 'Link de ingressos', width: 26 },
  { header: 'Ingressos vendidos', width: 12, note: 'Somente números' },
  { header: 'Pré Produção', width: 26, note: 'Link da ficha técnica / caderno técnico' },
  { header: 'Redes sociais', width: 22, note: 'Link do post / perfil' },
  {
    header: 'Combinado', width: 36,
    note: 'Texto livre. O sistema entende, por exemplo:\n"R$2.500 colocado"\n"80% bilheteria"\n"1500 de minimo ou 70% bilheteria"\n"6k + van + alimentação + hotel"\n"Entrada franca"',
  },
  { header: 'Passagens', width: 22 },
  { header: 'Hospedagem', width: 22 },
  { header: 'Lista de equipe', width: 22 },
  { header: 'Lista de convidados', width: 22 },
];

const MEMBER_COLS: Col[] = [
  { header: 'Banda', width: 22, list: 'artists', note: 'Obrigatório.' },
  { header: 'Nome', width: 32, note: 'Obrigatório. Nome completo (para listas e passagens).' },
  { header: 'Função', width: 22, note: 'Ex.: Vocal, Baixo, Técnico de som, Tour manager' },
  { header: 'Data de nascimento', width: 14, date: true },
  { header: 'RG', width: 16 },
  { header: 'CPF', width: 16 },
  { header: 'Telefone', width: 18 },
  { header: 'E-mail', width: 28 },
  { header: 'Preferências/Restrições', width: 32, note: 'Restrições alimentares, alergias, observações.' },
];

const CONTACT_COLS: Col[] = [
  { header: 'Região', width: 14, note: 'Opcional: é preenchida automaticamente pela UF.' },
  { header: 'Estado', width: 8, list: 'states' },
  { header: 'Cidade', width: 18 },
  { header: 'Casa/Fest/Coletivo', width: 26 },
  { header: 'Contratante', width: 26, note: 'Obrigatório (ou preencha a casa).' },
  { header: 'Telefone', width: 18 },
  { header: 'E-mail', width: 28 },
  { header: 'Instagram', width: 20 },
  { header: 'Link', width: 28 },
];

const SETTLEMENT_COLS: Col[] = [
  { header: 'Artista', width: 26, list: 'artists' },
  { header: 'Link da planilha de fechamento', width: 70, note: 'Link do Google Sheets com o acerto do artista.' },
];

export async function buildImportTemplate(artistNames: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Greenwaves OS';
  wb.created = new Date();

  // Instruções
  const info = wb.addWorksheet('Instruções', { properties: { tabColor: { argb: LIME } }, views: [{ showGridLines: false }] });
  info.columns = [{ width: 4 }, { width: 28 }, { width: 90 }];
  info.mergeCells('B2:C2');
  info.mergeCells('B3:C3');
  const title = info.getCell('B2');
  title.value = 'GREEN WAVE · MODELO DE IMPORTAÇÃO';
  title.font = { name: 'Arial Black', size: 18, color: { argb: FOREST } };
  info.getCell('B3').value = 'Preencha as abas a partir da linha 3 e importe em Configurações → Importar planilha. Reimportar não duplica registros.';
  info.getCell('B3').font = { italic: true, color: { argb: 'FF555555' } };
  const rows: [string, string][] = [
    ['Artistas', 'Cadastro do casting: release, Instagram, cidade e links de materiais. Opcional — artistas citados nas outras abas são criados automaticamente.'],
    ['Shows', 'Uma linha por show. Data e Banda são obrigatórias. O mesmo artista na mesma data e local atualiza o show existente.'],
    ['Dados das bandas', 'Integrantes e equipe de cada artista (uma linha por pessoa). RG e CPF ficam visíveis apenas para a administração.'],
    ['Contatos', 'Contratantes, casas, festivais e coletivos. A região é calculada pela UF.'],
    ['Fechamentos', 'Link da planilha de acerto de cada artista.'],
    ['Dicas', 'Não renomeie as abas nem os cabeçalhos (linha 2). Linhas de mês ("JANEIRO") e linhas vazias são ignoradas. Passe o mouse sobre os cabeçalhos para ver exemplos.'],
  ];
  rows.forEach(([k, v], i) => {
    const r = 5 + i;
    const kc = info.getCell(r, 2);
    kc.value = k;
    kc.font = { bold: true, color: { argb: CREAM } };
    kc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FOREST } };
    kc.alignment = { vertical: 'top', indent: 1 };
    const vc = info.getCell(r, 3);
    vc.value = v;
    vc.alignment = { wrapText: true, vertical: 'top' };
    info.getRow(r).height = 34;
  });

  const sheets: [string, string, Col[], string?][] = [
    ['Artistas', 'CASTING', ARTIST_COLS, LIME],
    ['Shows', 'AGENDA DE SHOWS', SHOW_COLS],
    ['Dados das bandas', 'DADOS DAS BANDAS', MEMBER_COLS],
    ['Contatos', 'CONTRATANTES', CONTACT_COLS],
    ['Fechamentos', 'FECHAMENTOS', SETTLEMENT_COLS],
  ];
  for (const [name, t, cols, tab] of sheets) validate(sheet(wb, name, t, cols, tab), cols, artistNames.length);

  // Listas (oculta) usadas nas listas suspensas
  const lists = wb.addWorksheet('Listas', { state: 'veryHidden' });
  lists.getCell('A1').value = 'Artistas';
  lists.getCell('B1').value = 'UF';
  artistNames.forEach((n, i) => (lists.getCell(i + 2, 1).value = n));
  BR_STATES.forEach((uf, i) => (lists.getCell(i + 2, 2).value = uf));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
