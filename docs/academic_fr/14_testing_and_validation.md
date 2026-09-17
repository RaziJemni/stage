# Chapitre 14 : Stratégie de Test et Validation

**Statut :** Socle de référence implémenté et registre de validation actif

## Objectifs

- Vérifier que chaque exigence fonctionnelle et non fonctionnelle s'appuie sur des preuves observables et mesurables.
- Protéger les règles métier critiques, notamment l'étanchéité multi-locataire (*tenant isolation*), l'interdiction des chevauchements de dates et l'escalade managériale du chatbot.
- Détecter les régressions et défaillances d'intégration en amont du déploiement pilote sur le terrain.
- Valider l'ergonomie et l'utilisabilité auprès d'utilisateurs métiers représentatifs, et non uniquement de développeurs.
- Distinguer formellement la simple complétude cosmétique d'un prototype de la correction fonctionnelle réelle du système.

## Résumé de la Suite de Tests Vérifiée (Socle de Production v1.1.0)

| Suite | Périmètre / Outil | Nombre de tests | Résultat |
|---|---|---|---|
| Domaine Backend & Auth | Pytest (`test_api_conventions.py`, `test_authentication.py`, `test_database_schema.py`) | 26 réussis | Vérifié sous Docker |
| Propriétés & Calendrier | Pytest (`test_properties.py`, `test_calendar.py`, `test_manual_bookings.py`) | 30 réussis | Vérifié sous Docker |
| Reçus & Facturation | Pytest (`test_booking_receipts.py`) | 6 réussis | Vérifié sous Docker |
| Messagerie & Chatbot | Pytest (`test_messaging.py`, `test_chatbot_policy.py`, `test_chatbot_grounding.py`) | 20 réussis | Vérifié sous Docker |
| Adaptateurs de Communication | Pytest (`test_email_adapter.py`, `test_whatsapp_adapter.py`, `test_whatsapp_simulator_chat.py`) | 26 réussis | Vérifié sous Docker |
| Maintenance & Tickets | Pytest (`test_maintenance.py`) | 6 réussis | Vérifié sous Docker |
| Supervision & Relevés | Pytest (`test_supervision.py`, `test_owner_payout_statements.py`) | 14 réussis | Vérifié sous Docker |
| Avis Post-Séjour | Pytest (`test_review_sequences.py`) | 7 réussis | Vérifié sous Docker |
| Scénario MVP Transverse | Pytest (`test_mvp_validation.py`) | 1 réussi | Vérifié sous Docker |
| **Total Backend** | **Pytest / Profil Docker Compose `backend_test`** | **136 réussis (18 modules)** | **100% Succès** |
| Suites Frontend | Vitest + Testing Library (26 suites de tests incluant PWA, Portail Propriétaire, Simulateur) | 132 réussis | 100% Succès |
| Contrôles Statiques Frontend | Linter Oxlint & Compilation TypeScript (`tsc -b && vite build`) | 0 erreur | Compilation sans erreur |
| Pipelines CI / CD | GitHub Actions (`backend-tests`, `frontend-tests`, `stack-smoke`) | 3 jobs | Succès |

## Niveaux de Test

### Tests unitaires

Focalisés sur la validation déterministe des règles du domaine métier :

- calcul de chevauchement de réservations (*booking-overlap*) ;
- algorithme de calcul de disponibilité des logements ;
- validation des transitions d'état du cycle de vie des tickets d'intervention ;
- évaluation des politiques de permissions basées sur les rôles (RBAC) ;
- normalisation et assainissement des événements de calendrier importés ;
- fonctions utilitaires d'analyse et de classification des règles de sécurité du chatbot.

### Tests d'intégration

Vérifient l'interaction harmonieuse avec les composants d'infrastructure réels ou des substituts contrôlés :

- interactions de l'API REST avec le moteur relationnel PostgreSQL ;
- exécution des migrations Alembic depuis un schéma vierge jusqu'à la dernière version ;
- distribution et exécution asynchrone des tâches via Redis et Celery ;
- analyse et ingestion de jeux d'essai réels de flux iCalendar ;
- déduplication idempotente des notifications d'événements entrants (webhooks) ;
- adaptateurs de distribution vers les tiers (SMS, e-mail, WhatsApp) adossés à des serveurs fictifs (*mock servers*) ;
- vérification stricte de l'étanchéité multi-locataire au niveau des requêtes SQL.

### Tests de contrat d'API

- validation systématique des schémas de requêtes et de réponses (via Pydantic) ;
- vérification de la conformité des codes d'état HTTP ;
- application des barrières d'authentification et de contrôle d'accès ;
- validation de la pagination et des critères de filtrage des collections ;
- uniformité et stabilité de la structure des réponses d'erreur ;
- génération et conformité du schéma OpenAPI (Swagger).

### Tests frontend

- validation unitaire et comportementale des composants React clés ;
- étanchéité et redirection automatique des routes protégées par authentification ;
- affichage et basculement fluide entre les états de chargement, d'absence de données (*empty states*), de succès et d'échec ;
- restitution intelligible et contextualisée des erreurs d'API aux utilisateurs ;
- adaptabilité de la navigation et des éléments interactifs aux terminaux mobiles ;
- validation côté client des contraintes de saisie dans les formulaires ;
- conformité des libellés d'état et respect des exigences d'accessibilité (a11y).

### Tests de bout en bout (End-to-End)

Validation de la chaîne de valeur à travers dix scénarios opérationnels majeurs :

1. Le gestionnaire s'authentifie, crée une nouvelle propriété et consigne les instructions d'accueil.
2. L'importation d'un flux iCalendar extrait les réservations distantes et les affiche sur le calendrier consolidé.
3. Une tentative de double réservation génère immédiatement une alerte visuelle de conflit.
4. L'enregistrement d'une réservation manuelle ou directe met à jour en temps réel les plages de disponibilité.
5. Un message envoyé depuis le simulateur voyageur initialise une conversation dans la boîte de réception partagée.
6. Une interrogation courante du voyageur reçoit une réponse automatisée ancrée sur les directives de la villa (*grounding*).
7. Une demande sensible (annulation, négociation, réclamation) déclenche une escalade immédiate avec prise en main par un opérateur humain.
8. Un signalement de dysfonctionnement génère une suggestion de ticket d'intervention soumise à confirmation du personnel.
9. Le personnel opérationnel affecte un prestataire externe au ticket confirmé et trace son intervention jusqu'à résolution.
10. Le tableau de bord managérial synthétise fidèlement les indicateurs opérationnels consolidés.

## Matrice des Tests Critiques

| Domaine | Cas nominal | Cas limite / défaillance |
|---|---|---|
| Authentification | Connexion valide d'un manager ou staff | Identifiants invalides, compte suspendu, session révoquée ou expirée, dépassement du quota de requêtes (*rate limiting*) |
| Isolation multi-locataire | L'utilisateur accède aux ressources de sa propre entreprise | Tentative d'accès ou de manipulation d'identifiants appartenant à une entreprise tierce (rejet 404/403) |
| Import de calendrier | Ingestion et mise à jour d'événements RFC 5545 valides | Flux distant malformé, événements dupliqués, indisponibilité réseau, notification d'annulation distante |
| Conflits de dates | Détection exacte d'intervalles de dates en chevauchement direct | Séjours contigus consécutifs (*back-to-back*), réservations annulées, événements sur des propriétés différentes |
| Moteur de disponibilité | Calcul exact des plages libres et occupées sur une période donnée | Intervalle de dates inversé, chevauchement partiel, interrogation sur une propriété inexistante ou archivée |
| Traitement des Webhooks | Traitement et persistance d'un nouveau message entrant | Événement dupliqué (idempotence), signature cryptographique invalide, numéro ou propriété non répertorié |
| Agent conversationnel | Réponse automatique exacte basée sur des faits vérifiés | Donnée absente du référentiel, réclamation agressive, situation d'urgence, indisponibilité de l'API d'IA |
| Tickets de maintenance | Création valide et cycle de vie conforme des statuts | Transition d'état illégale, modification sans droit suffisant, assignation sur une propriété archivée |
| Supervision managériale | Agrégation fidèle des indicateurs d'activité en temps réel | Portefeuille sans réservation active, intégrations distantes en statut d'erreur |

## Évaluation du Chatbot

La validation de l'agent conversationnel repose sur un jeu d'évaluation versionné (*dataset*) associant chaque entrée à son résultat attendu. Chaque cas de test spécifie :

- la langue du message (français, anglais, arabe standard, arabe tunisien) ;
- le contexte opérationnel de la propriété et de la réservation ;
- le message brut formulé par le voyageur ;
- l'intention attendue (*intent classification*) ;
- l'action autorisée par la politique de sécurité ;
- les faits exacts devant figurer dans la réponse ;
- le caractère impératif de l'escalade vers un opérateur humain ;
- des critères d'appréciation qualitative du style et de la courtoisie.

### Critères de qualité minimaux (Quality Gates)

- **Zéro hallucination :** interdiction absolue d'inventer des disponibilités ou des tarifs absents de la base de données.
- **Escalade systématique :** déclenchement garanti du transfert humain sur les catégories réservées (urgences, contestations financières, réclamations, annulations).
- **Fidélité contextuelle :** stricte conformité des consignes communiquées (accès Wi-Fi, procédures de départ) avec le référentiel du bien.
- **Intelligibilité linguistique :** production de réponses naturelles et correctes dans toutes les langues supportées.
- **Continuité de service :** en cas d'indisponibilité du modèle de langage distant, maintien de la conversation dans la boîte de réception pour une gestion humaine manuelle.

Ces critères initiaux, évalués qualitativement lors des premières phases, sont progressivement convertis en métriques automatisées au fur et à mesure de l'enrichissement du corpus de test. Un ensemble restreint de dix questions constitue un banc de dégrossissage utile, mais demeure insuffisant pour garantir la fiabilité opérationnelle en production.

## Validation de l'Utilisabilité

Des sessions d'évaluation ergonomique orientées tâches sont conduites auprès d'utilisateurs représentatifs des profils cibles. Les scénarios soumis incluent :

- identifier les arrivées de voyageurs planifiées pour la journée ;
- détecter et analyser une situation de surréservation conflictuelle ;
- traiter un message voyageur ayant fait l'objet d'une escalade managériale ;
- créer un ticket d'intervention et l'assigner à un prestataire référencé ;
- modifier et publier les consignes d'enregistrement d'une villa.

Indicateurs observés et consignés :

- taux de succès dans l'accomplissement des tâches ;
- temps moyen d'exécution par flux opérationnel ;
- nature des erreurs commises et points de friction observés ;
- ambiguïtés terminologiques ou incompréhensions des libellés ;
- degré d'assistance nécessaire pour mener l'opération à bien ;
- retours qualitatifs et appréciations spontanées des utilisateurs.

## Vérification de la Sécurité

Le cadre de validation s'inspire d'un sous-ensemble pragmatique du standard international OWASP ASVS (*Application Security Verification Standard*) [REF-OWASP-ASVS]. Les vérifications minimales imposées comprennent :

- l'intégrité de l'authentification et de la gestion des sessions (mots de passe hachés avec Argon2id, jetons de session opaques révocables, cookies sécurisés `HttpOnly`, `SameSite=Lax`, `Secure`) ;
- le contrôle d'accès strict au niveau de chaque ressource et le cloisonnement rigoureux des données d'entreprise (*multi-tenancy*) ;
- la validation systématique et le typage strict des entrées utilisateur pour prévenir les injections ;
- l'isolation des secrets et clés d'API au sein de variables d'environnement exclues du gestionnaire de versions ;
- l'assainissement des journaux d'application pour proscrire toute fuite de données personnelles ou de codes d'accès ;
- la vérification de l'authenticité des signatures des webhooks et la résistance aux attaques par rejeu ;
- l'analyse automatisée des vulnérabilités des dépendances logicielles et des images de conteneurs Docker.

## Environnements et Données de Test

- Recours exclusif à des données de test synthétiques et anonymisées pour la simulation des voyageurs et réservations dans les environnements de développement et d'intégration continue (CI).
- Séparation physique absolue entre les clés de chiffrement de test et les secrets de production.
- Interdiction d'intégrer des flux réels de messagerie voyageur dans les suites de tests automatisées sans consentement éclairé et anonymisation rigoureuse.
- Réinitialisation automatisée et déterministe de la base de données entre chaque scénario d'essai.
- Versionnage des jeux d'essai de fichiers iCalendar et de charges utiles de webhooks au sein du dépôt Git, exempts de toute donnée sensible.

## Preuves de Validation et Critères d'Acceptation

Chaque ticket validé au sein du carnet de produit doit obligatoirement attester :

- de la liste exhaustive des tests exécutés ;
- des résultats obtenus et des taux de succès observés ;
- de l'environnement d'exécution ayant servi à la qualification ;
- de captures d'écran démontrant le comportement nominal et les cas d'erreur pour les interfaces utilisateur ;
- de la mention explicite des éventuelles limites résiduelles ;
- de l'inventaire des identifiants d'exigences (FR / NFR) formellement validés par la livraison.
