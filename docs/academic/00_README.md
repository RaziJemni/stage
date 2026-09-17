# Vayca Academic Documentation

**Status:** Working academic baseline
**Language:** English
**Project type:** Three-person internship project
**Product:** B2B vacation-property operations platform
**Last baseline date:** 2026-07-28

## Purpose

This folder contains the project study, requirements analysis, conception, planning, and validation material for Vayca. It is organized so the chapters can later be combined into one academic PDF without restructuring the source files.

This baseline is intentionally editable. It records the team's current decisions, not irreversible commitments. Changes should be made through reviewed pull requests so that the implementation, backlog, diagrams, and final report remain aligned.

## Current Product Baseline

Vayca is a private B2B web application for vacation-property agencies and independent owners. It centralizes property information, booking calendars, guest conversations, chatbot assistance, and maintenance follow-up.

The internship MVP does not include a public marketplace, online payment processing, guest accounts, or contractor accounts. Independent owners may later use a lower-priced subscription while following the same company-based architecture.

## Document Order

The intended PDF assembly order is:

1. `01_project_overview.md`
2. `02_context_and_existing_study.md`
3. `03_stakeholders_and_needs.md`
4. `04_scope_and_assumptions.md`
5. `05_functional_requirements.md`
6. `06_non_functional_requirements.md`
7. `07_use_case_analysis.md`
8. `08_module_decomposition.md`
9. `09_system_architecture.md`
10. `10_data_conception.md`
11. `11_chatbot_and_integrations.md`
12. `12_uml_and_workflow_models.md`
13. `13_project_management.md`
14. `14_testing_and_validation.md`
15. `15_risks_and_constraints.md`
16. `16_traceability_matrix.md`
17. `17_references_glossary_and_decisions.md`
18. `18_ui_ux_prototype_and_interaction_specification.md`

## Writing Rules

- Use one top-level heading per file.
- Keep heading levels sequential so PDF generation can build a correct table of contents.
- Use stable identifiers such as `FR-AUTH-01`, `NFR-SEC-01`, and `UC-CAL-01`.
- Label uncertain items as assumptions or open decisions.
- Do not present prototype screens, mock data, or simulated integrations as completed production functionality.
- Update the traceability matrix whenever a requirement is added, removed, or materially changed.
- Record important scope changes in the decision log.

## Status Vocabulary

| Status | Meaning |
|---|---|
| Proposed | Suggested but not yet accepted by the team |
| Accepted | Agreed as the current working decision |
| Implemented | Present in code and verified |
| Deferred | Intentionally moved outside the MVP |
| Rejected | Considered and excluded |

## PDF Generation and Official Export

The 18 chapters are compiled into unified, publication-ready academic monographs:

- **English PDF Book:** [`Vayca_Academic_Book_EN.pdf`](Vayca_Academic_Book_EN.pdf) (canonical: [`Vayca_Academic_Book.pdf`](Vayca_Academic_Book.pdf)) — Complete 101-page monograph in English featuring an executive cover page, dynamic Table of Contents with exact chapter starting page numbers, A4 paged typography, vector SVG Mermaid diagrams, zebra-striped requirement tables, and dynamic running headers/footers with page numbering.
- **French PDF Book:** [`Vayca_Academic_Book_FR.pdf`](../academic_fr/Vayca_Academic_Book_FR.pdf) (also accessible at [`Vayca_Academic_Book_FR.pdf`](Vayca_Academic_Book_FR.pdf)) — Complete formal French monograph (rapport de projet de fin d'études / PFE d'ingénieur en génie logiciel) covering all 18 chapters, with tailored French executive cover, dynamic Table des Matières, and French-annotated diagrams.
- **Standalone Offline HTML Editions:** [`Vayca_Academic_Book_EN.html`](Vayca_Academic_Book_EN.html) and [`Vayca_Academic_Book_FR.html`](../academic_fr/Vayca_Academic_Book_FR.html) — Self-contained HTML editions viewable in any browser offline without a web server.
- **Build Pipeline Script:** [`scripts/generate_academic_book.js`](../../scripts/generate_academic_book.js) and [`scripts/extract_toc_pages.py`](../../scripts/extract_toc_pages.py) — Automated two-pass Node.js + Python compilation pipeline converting Markdown chapters into semantic HTML and printing to PDF via headless Chromium/Puppeteer (`node scripts/generate_academic_book.js` for English, `--lang=fr` for French).


