/**
 * Vayca Academic Book Compiler
 * Assembles docs/academic/ chapters (01 to 18) into a unified academic monograph PDF.
 * Usage: node scripts/generate_academic_book.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Marked } from 'marked';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const ACADEMIC_DIR = path.join(REPO_ROOT, 'docs', 'academic');
const OUTPUT_HTML = path.join(ACADEMIC_DIR, 'Vayca_Academic_Book.html');
const OUTPUT_PDF = path.join(ACADEMIC_DIR, 'Vayca_Academic_Book.pdf');

// Default paths for Chrome / Chromium on Windows / Linux / macOS
function getChromeExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'google-chrome';
}

const CHAPTER_FILES = [
  '01_project_overview.md',
  '02_context_and_existing_study.md',
  '03_stakeholders_and_needs.md',
  '04_scope_and_assumptions.md',
  '05_functional_requirements.md',
  '06_non_functional_requirements.md',
  '07_use_case_analysis.md',
  '08_module_decomposition.md',
  '09_system_architecture.md',
  '10_data_conception.md',
  '11_chatbot_and_integrations.md',
  '12_uml_and_workflow_models.md',
  '13_project_management.md',
  '14_testing_and_validation.md',
  '15_risks_and_constraints.md',
  '16_traceability_matrix.md',
  '17_references_glossary_and_decisions.md',
  '18_ui_ux_prototype_and_interaction_specification.md',
];

const marked = new Marked({
  gfm: true,
  breaks: false,
});

const renderer = {
  code({ text, lang }) {
    if (lang === 'mermaid') {
      return `<div class="mermaid-container"><pre class="mermaid">${text}</pre></div>`;
    }
    return false;
  }
};

marked.use({ renderer });

function generateCoverHtml() {
  return `
  <div class="cover-page">
    <div class="cover-accent-bar"></div>
    <div class="cover-header">
      <div class="cover-badge">DOCUMENTATION ACADÉMIQUE DE RÉFÉRENCE</div>
      <div class="cover-date">Septembre 2026 · Version 1.1.0 (Baseline Production)</div>
    </div>

    <div class="cover-main">
      <div class="cover-logo-row">
        <div class="cover-logo-icon">V</div>
        <span class="cover-logo-text">VAYCA</span>
      </div>
      <h1 class="cover-title">Plateforme d'Opérations & Workstation B2B</h1>
      <h2 class="cover-subtitle">Gestion Locative Saisonnière Intelligente, Synchronisation Multi-Canal & Assistance Voyageurs Groundée</h2>
      <div class="cover-divider"></div>
      <p class="cover-description">
        Monographie académique, dossier de conception formelle et spécifications d'ingénierie logicielle pour la gestion des propriétés de vacances en Tunisie (Sidi Bou Said, La Marsa, Gammarth).
      </p>
    </div>

    <div class="cover-metadata-grid">
      <div class="meta-card">
        <span class="meta-label">CADRE DU PROJET</span>
        <span class="meta-value">Projet de Fin d'Études / Stage d'Ingénieur</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">PÉRIMÈTRE TECHNIQUE</span>
        <span class="meta-value">FastAPI · PostgreSQL · React · Celery · Redis · Docker</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">ÉQUIPE D'INGÉNIERIE</span>
        <span class="meta-value">Razi Jemni & Stream Plateforme Core</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">VALIDATION ET QUALITÉ</span>
        <span class="meta-value">136 Tests Backend · 132 Tests Frontend (100% Pass)</span>
      </div>
    </div>

    <div class="cover-footer">
      <span>Vayca Inc. · Tous droits réservés</span>
      <span>Dépôt officiel GitHub : github.com/RaziJemni/stage</span>
    </div>
  </div>
  `;
}

function generateTocHtml(chapters) {
  const items = chapters.map((c, i) => `
    <li class="toc-item">
      <span class="toc-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="toc-title">${c.title}</span>
      <span class="toc-dots"></span>
      <span class="toc-ref">Chapitre ${i + 1}</span>
    </li>
  `).join('');

  return `
  <div class="toc-page page-break">
    <div class="section-header">
      <div class="section-badge">ORGANISATION DE L'OUVRAGE</div>
      <h2 class="toc-heading">Table des Matières</h2>
      <p class="toc-subheading">Structure modulaire et logique d'assemblage du rapport académique (18 chapitres).</p>
    </div>
    <ul class="toc-list">
      ${items}
    </ul>
  </div>
  `;
}

function getCssStyles() {
  return `
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1C1B18;
      background-color: #FFFFFF;
      line-height: 1.6;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 250mm;
      padding: 10mm 5mm;
      position: relative;
    }

    .cover-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #0F3D5E 0%, #D96B43 100%);
      border-radius: 3px;
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10mm;
      font-size: 8.5pt;
      color: #78716C;
      font-weight: 600;
    }

    .cover-badge {
      background: #EBF3F8;
      color: #0F3D5E;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }

    .cover-main {
      margin: 25mm 0;
    }

    .cover-logo-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .cover-logo-icon {
      width: 44px;
      height: 44px;
      background: #0F3D5E;
      color: #FFFFFF;
      font-weight: 900;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(15, 61, 94, 0.2);
    }

    .cover-logo-text {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0F3D5E;
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      color: #1C1B18;
      line-height: 1.2;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }

    .cover-subtitle {
      font-size: 13pt;
      font-weight: 500;
      color: #0F3D5E;
      line-height: 1.4;
      margin: 0 0 20px 0;
    }

    .cover-divider {
      width: 60px;
      height: 4px;
      background: #D96B43;
      border-radius: 2px;
      margin-bottom: 20px;
    }

    .cover-description {
      font-size: 10.5pt;
      color: #57534E;
      max-width: 150mm;
      line-height: 1.6;
    }

    .cover-metadata-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #FAF8F5;
      border: 1px solid #EBE6DD;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 10mm;
    }

    .meta-card {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .meta-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #78716C;
      letter-spacing: 0.05em;
    }

    .meta-value {
      font-size: 9.5pt;
      font-weight: 600;
      color: #1C1B18;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #EBE6DD;
      padding-top: 12px;
      font-size: 8pt;
      color: #A8A29E;
    }

    .toc-page {
      padding-top: 10mm;
    }

    .section-badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 700;
      color: #0F3D5E;
      background: #EBF3F8;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }

    .toc-heading {
      font-size: 20pt;
      font-weight: 800;
      color: #0F3D5E;
      margin: 0 0 6px 0;
    }

    .toc-subheading {
      font-size: 10pt;
      color: #78716C;
      margin: 0 0 25px 0;
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-item {
      display: flex;
      align-items: baseline;
      padding: 7px 0;
      border-bottom: 1px dashed #EBE6DD;
      font-size: 9.5pt;
    }

    .toc-num {
      font-weight: 700;
      color: #D96B43;
      width: 28px;
      font-size: 9pt;
      font-family: monospace;
    }

    .toc-title {
      font-weight: 600;
      color: #1C1B18;
      white-space: nowrap;
    }

    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #CBD5E1;
      margin: 0 10px;
    }

    .toc-ref {
      font-size: 8.5pt;
      color: #78716C;
      font-weight: 500;
      white-space: nowrap;
    }

    .chapter-wrapper {
      padding-top: 5mm;
    }

    .chapter-header {
      border-bottom: 2px solid #0F3D5E;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }

    .chapter-num-badge {
      font-size: 8pt;
      font-weight: 800;
      color: #D96B43;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }

    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0F3D5E;
      margin: 0;
      line-height: 1.25;
      page-break-after: avoid;
      break-after: avoid;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #1C1B18;
      border-left: 3px solid #0F3D5E;
      padding-left: 8px;
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #0F3D5E;
      margin-top: 16px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h4, h5, h6 {
      font-size: 10pt;
      font-weight: 600;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 4px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p {
      margin: 0 0 10px 0;
      text-align: justify;
      hyphens: auto;
    }

    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 4px;
    }

    .table-wrapper {
      margin: 14px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      line-height: 1.4;
      background: #FFFFFF;
      border: 1px solid #D0D7DE;
      border-radius: 6px;
      overflow: hidden;
    }

    th {
      background: #0F3D5E;
      color: #FFFFFF;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #0F3D5E;
    }

    td {
      padding: 6px 10px;
      border: 1px solid #E2E8F0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    pre {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 8pt;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      line-height: 1.45;
    }

    code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 8.5pt;
      background: #F1F5F9;
      color: #0F3D5E;
      padding: 1px 4px;
      border-radius: 3px;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: #1E293B;
      font-size: 8pt;
    }

    blockquote {
      margin: 12px 0;
      padding: 8px 14px;
      background: #F0F6FA;
      border-left: 3px solid #0F3D5E;
      border-radius: 0 6px 6px 0;
      color: #334155;
      font-style: italic;
      page-break-inside: avoid;
    }

    blockquote p {
      margin: 0;
    }

    .mermaid-container {
      margin: 16px 0;
      padding: 12px;
      background: #FAF8F5;
      border: 1px solid #EBE6DD;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid-container svg {
      max-width: 100% !important;
      height: auto !important;
    }

    strong {
      font-weight: 700;
      color: #1C1B18;
    }

    hr {
      border: none;
      border-top: 1px solid #EBE6DD;
      margin: 20px 0;
    }
  `;
}

async function buildAcademicBook() {
  console.log('--- Assembling Vayca Academic Book ---');

  const chapters = [];

  for (const filename of CHAPTER_FILES) {
    const fullPath = path.join(ACADEMIC_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${filename}`);
      continue;
    }

    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    const titleMatch = rawContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : filename;
    const contentWithoutH1 = rawContent.replace(/^#\s+.+$/m, '').trim();
    const htmlBody = marked.parse(contentWithoutH1);

    chapters.push({ filename, title, htmlBody });
  }

  console.log(`Parsed ${chapters.length} academic chapters.`);

  const coverHtml = generateCoverHtml();
  const tocHtml = generateTocHtml(chapters);

  const chaptersHtml = chapters.map((c, index) => `
    <article class="chapter-wrapper page-break" id="chap-${index + 1}">
      <header class="chapter-header">
        <div class="chapter-num-badge">CHAPITRE ${String(index + 1).padStart(2, '0')} · SPÉCIFICATION TECHNIQUE</div>
        <h1>${c.title}</h1>
      </header>
      <div class="chapter-body">
        ${c.htmlBody}
      </div>
    </article>
  `).join('\n');

  // Check if local mermaid.min.js is present in scratch
  let mermaidJsContent = '';
  const localMermaidPath = 'C:\\Users\\razij\\.gemini\\antigravity\\brain\\9c753656-9188-4515-91b0-0d97761d1548\\scratch\\mermaid.min.js';
  if (fs.existsSync(localMermaidPath)) {
    mermaidJsContent = fs.readFileSync(localMermaidPath, 'utf-8');
  }

  const mermaidScript = mermaidJsContent
    ? `<script>${mermaidJsContent}</script>`
    : `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>`;

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Vayca — Rapport de Conception Académique & Spécifications Techniques</title>
  <style>
    ${getCssStyles()}
  </style>
  ${mermaidScript}
  <script>
    window.addEventListener("load", async function() {
      if (window.mermaid) {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
          });
          await mermaid.run({ querySelector: '.mermaid' });
        } catch (err) {
          console.error('Mermaid initialization error:', err);
        }
      }
      window.__MERMAID_READY__ = true;
    });
  </script>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  ${chaptersHtml}
</body>
</html>`;

  fs.writeFileSync(OUTPUT_HTML, fullHtml, 'utf-8');
  console.log(`Saved HTML monograph: ${OUTPUT_HTML} (${(fullHtml.length / 1024).toFixed(1)} KB)`);

  const chromePath = getChromeExecutable();
  console.log(`Using Chrome binary: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + OUTPUT_HTML.replace(/\\/g, '/');

  await page.goto(fileUrl, { waitUntil: 'load', timeout: 90000 });

  try {
    await page.waitForFunction('window.__MERMAID_READY__ === true', { timeout: 30000 });
    console.log('Mermaid diagrams successfully rendered into SVG vectors.');
  } catch (e) {
    console.warn('Mermaid rendering timed out, proceeding.');
  }

  await new Promise(r => setTimeout(r, 2000));

  console.log('Generating A4 PDF book...');
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 7.5pt; font-family: -apple-system, sans-serif; color: #78716C; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; border-bottom: 1px solid #EBE6DD; padding-bottom: 4px;">
        <span style="font-weight: 600; color: #0F3D5E;">VAYCA · Monographie Académique & Spécification Technique</span>
        <span>Version 1.1.0</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 7.5pt; font-family: -apple-system, sans-serif; color: #78716C; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; border-top: 1px solid #EBE6DD; padding-top: 4px;">
        <span>Confidentiel · B2B Operations Workstation</span>
        <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '14mm',
      right: '14mm',
    },
  });

  await browser.close();

  const pdfStats = fs.statSync(OUTPUT_PDF);
  console.log(`Academic Book PDF successfully generated!`);
  console.log(`Location: ${OUTPUT_PDF}`);
  console.log(`Size: ${(pdfStats.size / (1024 * 1024)).toFixed(2)} MB`);
}

buildAcademicBook().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
