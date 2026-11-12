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
  /* Ficha técnica de produção (várias páginas) */
  .gw-page { background: #FDF7EC; width: 210mm; min-height: 297mm; margin: 0 auto 24px; box-shadow: 0 8px 30px rgba(0,0,0,.12); display: flex; flex-direction: column; box-sizing: border-box; break-after: page; position: relative; }
  .gw-page:last-child { break-after: auto; }
  .gw-band { background: radial-gradient(120% 140% at 90% 0%, #2F7A5B 0%, #1C5A44 40%, #0F3B2C 75%, #0A2A1F 100%); color: #FFF7EA; padding: 9mm 12mm 6mm; }
  .gw-band-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,247,234,.3); padding-bottom: 6px; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
  .gw-body { flex: 1; padding: 6mm 12mm; }
  .gw-foot { background: #0F3B2C; color: #FFF7EA; padding: 3.5mm 12mm; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; }
  .gw-h { display: flex; align-items: center; gap: 10px; font-size: 10.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #1C5A44; margin: 14px 0 8px; }
  .gw-h::after { content: ''; flex: 1; border-top: 1.5px solid #CBD9C5; }
  .gw-pill { display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid #1C5A44; color: #1C5A44; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 700; text-decoration: none; margin: 0 6px 6px 0; }
  .gw-keytimes { display: grid; grid-template-columns: repeat(4, 1fr); border: 1.5px solid #1C5A44; border-radius: 12px; overflow: hidden; }
  .gw-keytimes > div { padding: 8px 12px; border-right: 1px solid #CBD9C5; }
  .gw-keytimes > div:last-child { border-right: 0; }
  .gw-keytimes .k { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #555; }
  .gw-keytimes .hl { background: #0F3B2C; color: #FFF7EA; }
  .gw-keytimes .hl .k { color: #C9E13E; }
  .gw-kv { display: grid; grid-template-columns: 34mm 1fr; border-bottom: 1px solid #E6E0D2; padding: 7px 0; font-size: 12px; }
  .gw-kv .k { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #666; padding-top: 2px; }
  .gw-run { display: grid; grid-template-columns: 34mm 1fr; padding: 7px 10px; border-bottom: 1px solid #E6E0D2; font-size: 12.5px; align-items: center; }
  .gw-run.ours { background: #D7EA3A; border-radius: 6px; font-weight: 800; text-transform: uppercase; border-bottom: 0; margin: 2px 0; }
  .gw-card { border: 1.5px solid #1C5A44; border-radius: 10px; padding: 8px 12px; }
  .gw-card.dark { background: #0F3B2C; color: #FFF7EA; border-color: #0F3B2C; }
  .gw-card ul { margin: 4px 0 0; padding-left: 14px; font-size: 11.5px; }
  .gw-card li::marker { color: #2E8B57; }
  .gw-weather { background: radial-gradient(120% 140% at 90% 0%, #2F7A5B 0%, #1C5A44 45%, #0F3B2C 100%); color: #FFF7EA; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; break-inside: avoid; }
  @page { size: A4; margin: 0; }
  @media print {
    html, body { background: #fff !important; }
    .gw-print { padding: 0; }
    .gw-toolbar { display: none !important; }
    .gw-sheet { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 10mm 12mm 8mm; }
    .gw-page { box-shadow: none; margin: 0; width: 210mm; min-height: 297mm; height: 297mm; overflow: hidden; }
    .gw-section { margin-top: 10px; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .leaflet-control-zoom { display: none; }
  }
`;
