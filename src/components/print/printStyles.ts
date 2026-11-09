// Estilos das páginas de exportação (roadbook / roadmap): A4, fundo branco e cores preservadas no PDF.
export const PRINT_CSS = `
  html, body { background: #E9E4D8 !important; color: #17201C !important; }
  .gw-print { color: #17201C; font-family: var(--font-body), system-ui, sans-serif; padding: 24px 0 48px; }
  .gw-sheet { background: #FFFDF8; width: 210mm; min-height: 297mm; margin: 0 auto 24px; padding: 14mm 14mm 12mm; box-shadow: 0 8px 30px rgba(0,0,0,.12); box-sizing: border-box; }
  .gw-display { font-family: var(--font-display), system-ui, sans-serif; font-weight: 900; font-stretch: 125%; text-transform: uppercase; letter-spacing: -0.01em; line-height: .95; }
  .gw-over { font-size: 9.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #1C5A44; margin: 0 0 6px; }
  .gw-section { break-inside: avoid; margin-top: 14px; }
  .gw-box { border: 1px solid #DDD6C6; border-radius: 10px; padding: 10px 12px; }
  .gw-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  .gw-table th { text-align: left; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: #5c5c5c; border-bottom: 1.5px solid #1C5A44; padding: 5px 6px; }
  .gw-table td { border-bottom: 1px solid #E6E0D2; padding: 6px; vertical-align: top; }
  .gw-table tr { break-inside: avoid; }
  .gw-check { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #1C5A44; border-radius: 3px; vertical-align: -2px; text-align: center; font-size: 10px; line-height: 10px; font-weight: 900; color: #1C5A44; }
  .gw-tag { display: inline-block; border: 1px solid #1C5A44; color: #1C5A44; border-radius: 6px; padding: 1px 6px; font-size: 10.5px; font-weight: 700; margin: 0 4px 4px 0; }
  .gw-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .gw-muted { color: #666; }
  .gw-toolbar { position: sticky; top: 0; z-index: 1000; display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px; margin: -24px 0 20px; background: #0F3B2C; color: #FFF7EA; }
  .gw-toolbar a, .gw-toolbar button { font: 700 14px var(--font-body), system-ui; border-radius: 999px; padding: 8px 16px; border: 1px solid rgba(255,247,234,.4); background: transparent; color: #FFF7EA; text-decoration: none; cursor: pointer; }
  .gw-toolbar .primary { background: #C9E13E; color: #17201C; border-color: #C9E13E; }
  @media screen and (max-width: 820px) { .gw-sheet { width: 100%; min-height: auto; padding: 16px; } .gw-grid2 { grid-template-columns: 1fr; } }
  @page { size: A4; margin: 0; }
  @media print {
    html, body { background: #fff !important; }
    .gw-print { padding: 0; }
    .gw-toolbar { display: none !important; }
    .gw-sheet { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 10mm 12mm 8mm; }
    .gw-section { margin-top: 10px; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .leaflet-control-zoom { display: none; }
  }
`;
