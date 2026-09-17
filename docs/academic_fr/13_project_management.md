# Chapitre 13 : Gestion de Projet et Démarche Agile

**Statut :** Méthode de travail proposée ; affectation de l'équipe soumise à confirmation collective

## Contexte de l'Équipe

Vayca est développé par une équipe de trois étudiants dans le cadre d'un stage de fin d'études en génie logiciel. L'équipe adopte une méthode de travail itérative et légère, guidée par des exigences fonctionnelles explicites et des revues systématiques des intégrations. L'objectif n'est pas de reproduire les processus lourds d'une grande entreprise, mais de rendre le développement parallèle compréhensible, rigoureusement testable et facilement réversible en cas d'anomalie.

## Démarche Méthodologique Recommandée

Le projet privilégie des itérations courtes rythmées par les étapes suivantes :

1. Sélectionner une exigence approuvée et le ticket GitHub (*issue*) correspondant.
2. Confirmer les dépendances préalables et les critères d'acceptation.
3. Créer une branche de fonctionnalité (*feature branch*) à partir de la branche `testing` courante.
4. Implémenter une unité de travail cohérente et vérifiable.
5. Exécuter les tests automatisés ciblés et consigner les preuves d'exécution.
6. Ouvrir une demande d'intégration (*pull request*) vers la branche `testing`.
7. Soumettre le code à la revue critique d'au moins un coéquipier.
8. Intégrer les modifications et valider le comportement global de l'environnement consolidé.
9. Promouvoir les incréments stables de `testing` vers la branche `main` pour les versions de démonstration et de soutenance.

## Modèle de Gestion des Branches Git

```text
main
  ^
  | promotion validée après revue
testing
  ^
  | pull requests de fonctionnalités revues
feature/<nom-court-de-la-fonctionnalite>
```

Règles de gestion des versions :

- Ne jamais développer ni commiter directement sur les branches `main` ou `testing`.
- Créer systématiquement les branches de fonctionnalités à partir de la version la plus récente de `testing`.
- Restreindre chaque branche à un ticket unique ou à un ensemble de modifications étroitement liées.
- Adopter les préfixes de message de commit normalisés : `feat:`, `fix:`, `docs:`, `test:` ou `chore:`.
- Exiger obligatoirement la revue et l'approbation d'au moins un coéquipier avant toute fusion.
- Supprimer définitivement la branche de fonctionnalité dès son intégration complétée.

## Structure du Projet GitHub

États d'avancement recommandés pour le tableau de bord (*Kanban*) :

- **Backlog** : carnet de produit consolidé ;
- **Ready** : éléments prêts pour l'implémentation ;
- **In Progress** : travaux en cours de développement ;
- **In Review** : code en attente de revue par les pairs ;
- **Done** : incréments vérifiés et validés ;
- **Resources** : documentation et éléments de référence non soumis aux livraisons.

Champs de métadonnées recommandés pour chaque ticket :

- **Phase** : MVP ou Phase 2 ;
- **Module** : Socle technique (*Foundation*), Calendrier (*Calendar*), Communication, Maintenance, Supervision ;
- **Priorité** : classification MoSCoW (*Must*, *Should*, *Could*) ;
- **Responsable** (*Owner*) ;
- **Itération** ;
- **Dépendance** ou référence vers un ticket bloquant ;
- **Identifiants d'exigences** (FR-... / NFR-...).

## Standard de Qualité des Tickets (Issues)

Chaque ticket d'implémentation doit obligatoirement respecter la structure formelle suivante :

```markdown
## Problème
Quel besoin utilisateur ou système approuvé est traité ?

## Périmètre
Que comprend explicitement ce ticket, et quelles sont les exclusions formelles ?

## Exigences
FR-... / NFR-...

## Dépendances
Bloqué par #...

## Critères d'acceptation
- [ ] Résultat observable et vérifiable
- [ ] Prise en compte des cas limites, d'échec et d'état vide
- [ ] Contrôle des habilitations et respect de l'isolation multi-locataire
- [ ] Preuves d'exécution des tests automatisés

## Impact documentaire
Fichiers de spécification ou diagrammes UML devant être actualisés
```

Les fonctionnalités d'envergure du carnet de produit, telles que « l'intégration de WhatsApp », doivent impérativement être fractionnées en sous-tâches granulaires : vérification de l'authenticité du webhook, persistance des messages entrants, résolution de la conversation, distribution des réponses sortantes, gestion des accusés de réception et mode simulateur / test.

## Découpage Suggéré en Lots de Travail (Itérations)

### Itération 0 : Gel de la conception (*Conception freeze*)

- Valider les besoins des parties prenantes, le périmètre, les acteurs, la structure de navigation, les modules et le modèle du domaine initial.
- Rapprocher l'ensemble des tickets GitHub des identifiants d'exigences formelles.
- Établir les conventions d'API REST et le format standardisé des erreurs.
- Vérifier le démarrage autonome et reproductible de la pile Docker Compose.

### Itération 1 : Socle technique et référentiel des propriétés

- Mettre en place l'environnement de migrations de schéma de base de données (Alembic).
- Implémenter les entités Entreprise (*Company*) et Utilisateur (*User*).
- Déployer l'authentification et l'autorisation par rôles (Manager, Staff).
- Développer l'API REST de gestion des propriétés et l'interface utilisateur connectée.

### Itération 2 : Moteur central de calendrier

- Gérer la saisie des réservations manuelles et directes.
- Implémenter le service de calcul dynamique de la disponibilité.
- Développer l'analyseur de flux iCalendar (RFC 5545) et le journal de synchronisation.
- Implémenter la détection proactive des chevauchements et conflits de dates.
- Construire l'interface de calendrier connectée aux données réelles du backend.

### Itération 3 : Cœur de la messagerie et communication

- Implémenter le modèle de données des conversations et des messages.
- Développer le simulateur de webhooks pour les tests hors ligne.
- Construire la boîte de réception partagée et la vue de conversation reliée à l'API.
- Déployer le mécanisme de reprise en main manuelle (*manual takeover*) par le personnel.

### Itération 4 : Agent conversationnel (Chatbot) et maintenance

- Développer le système de réponses ancrées sur les directives opérationnelles du bien (*grounding*).
- Intégrer l'outil d'interrogation de la disponibilité réelle en base de données.
- Implémenter l'évaluation des règles d'escalade managériale obligatoire.
- Développer la détection et la suggestion automatique de tickets d'intervention avec confirmation humaine.
- Gérer l'annuaire des prestataires externes et le cycle de vie complet des tickets.

### Itération 5 : Intégrations externes et supervision

- Mettre en œuvre l'adaptateur de test WhatsApp et les webhooks en conditions réelles.
- Implémenter les mécanismes de résilience face aux pannes des fournisseurs tiers.
- Élaborer les modèles de lecture optimisés pour le tableau de bord de supervision.
- Réaliser les campagnes de validation de sécurité, de performance et d'ergonomie mobile (PWA).

### Itération 6 : Déploiement pilote et finalisation académique

- Conduire une démonstration complète de bout en bout des flux opérationnels.
- Collecter et analyser les retours d'expérience du déploiement pilote.
- Corriger les anomalies résiduelles.
- Finaliser les diagrammes d'architecture, captures d'écran réelles, métriques de tests et générer le rapport académique de synthèse.

## Définition de Prêt (Definition of Ready - DoR)

Un ticket est formellement qualifié de « Prêt » pour développement lorsque les conditions suivantes sont réunies :

- Les identifiants des exigences couvertes sont explicitement référencés ;
- Les critères d'acceptation sont observables, vérifiables et non ambigus ;
- Les dépendances techniques préalables sont satisfaites ou rigoureusement planifiées ;
- Les choix d'architecture d'API et de structures de données sont convenus ;
- Le membre de l'équipe responsable de la réalisation est identifié ;
- Aucune décision architecturale non tranchée ne bloque la conception.

## Définition de Terminé (Definition of Done - DoD)

Un ticket est formellement qualifié de « Terminé » uniquement lorsque :

- L'implémentation est connectée à une couche de persistance réelle ou à un simulateur explicitement documenté ;
- Les règles d'autorisation et d'isolation stricte des locataires (*tenant isolation*) sont effectives ;
- L'ensemble des états de l'interface (nominal, chargement, vide, échec) est géré ergonomiquement ;
- Les tests automatisés ciblés (unitaires et d'intégration) s'exécutent avec succès ;
- La documentation technique, les schémas et la matrice de traçabilité sont mis à jour ;
- La demande d'intégration (*pull request*) a reçu l'approbation formelle d'un pair ;
- Le bon fonctionnement est vérifié dans l'environnement consolidé après fusion dans la branche `testing`.

## Responsabilités Documentaires

La rédaction et la maintenance de la documentation technique constituent une responsabilité partagée au sein de l'équipe, bien qu'un membre assure un rôle de coordination éditoriale. Chaque responsable de module assure l'actualisation de :

- La description des exigences impactées par les développements ;
- Les spécifications d'API et les évolutions de schéma de base de données ;
- Les diagrammes UML et modélisations de flux de travail afférents ;
- Les jeux de données et preuves d'exécution des tests ;
- Les risques opérationnels et limites techniques identifiés.

Le coordinateur de la documentation garantit l'homogénéité rédactionnelle et la cohérence de l'ensemble, sans jamais trancher arbitrairement des choix de conception sans l'aval de l'équipe.
