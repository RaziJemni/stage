# Documentation Académique Vayca (Édition Française)

**Statut :** Spécification académique de référence complète (Version 1.1.0)  
**Langue :** Français  
**Type de projet :** Projet de Fin d'Études / Stage d'Ingénieur  
**Produit :** Plateforme d'Opérations & Workstation B2B pour la Gestion Locative Saisonnière  
**Dernière mise à jour :** 17 Septembre 2026  

## Objectif

Ce dossier contient l'étude préalable, l'analyse des exigences, la conception formelle, la gestion de projet et les résultats de validation de la plateforme Vayca, rédigés en français académique pour le mémoire de fin d'études et la soutenance universitaire.

Les chapitres sont ordonnés de manière séquentielle pour permettre une compilation automatisée en un livre PDF unifié (`Vayca_Academic_Book_FR.pdf`).

## Ordre d'Assemblage des Chapitres

1. `01_project_overview.md` — Vue d'ensemble du projet
2. `02_context_and_existing_study.md` — Contexte et étude de l'existant
3. `03_stakeholders_and_needs.md` — Parties prenantes et analyse des besoins
4. `04_scope_and_assumptions.md` — Périmètre et hypothèses
5. `05_functional_requirements.md` — Exigences fonctionnelles
6. `06_non_functional_requirements.md` — Exigences non-fonctionnelles
7. `07_use_case_analysis.md` — Analyse des cas d'utilisation
8. `08_module_decomposition.md` — Décomposition modulaire
9. `09_system_architecture.md` — Architecture système
10. `10_data_conception.md` — Conception des données
11. `11_chatbot_and_integrations.md` — Conception du chatbot et intégrations
12. `12_uml_and_workflow_models.md` — Modèles UML et workflows opérationnels
13. `13_project_management.md` — Gestion de projet et démarche Agile
14. `14_testing_and_validation.md` — Stratégie de test et validation
15. `15_risks_and_constraints.md` — Analyse des risques et contraintes
16. `16_traceability_matrix.md` — Matrice de traçabilité
17. `17_references_glossary_and_decisions.md` — Références, glossaire et registre de décisions
18. `18_ui_ux_prototype_and_interaction_specification.md` — Architecture UI/UX et spécifications d'interaction

## Génération du Livre PDF

Le script Node.js [`scripts/generate_academic_book.js`](../../scripts/generate_academic_book.js) compile automatiquement les chapitres français en un rapport complet :

```bash
node scripts/generate_academic_book.js --lang=fr
```

Cette commande produit :
- **Livre PDF complet :** `docs/academic_fr/Vayca_Academic_Book_FR.pdf` (format A4 avec page de garde exécutive, table des matières dynamique avec numéros de page de début de chaque chapitre, diagrammes vectoriels Mermaid et pagination dynamique).
- **Édition HTML autonome :** `docs/academic_fr/Vayca_Academic_Book_FR.html` (consultable hors ligne dans n'importe quel navigateur).
