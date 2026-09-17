# Chapitre 17 : Références, Glossaire et Registre de Décisions

**Statut :** Chapitre de support actif

## Références

### Contexte sectoriel et juridique tunisien

- **REF-INS-CST-2024 :** Institut National de la Statistique, Tunisie, « Compte Satellite du Tourisme 2023-2024 », 2026. https://www.ins.tn/publication/compte-satellite-du-tourisme-2023-2024
- **REF-INS-ACCOMMODATION :** Institut National de la Statistique, Tunisie, séries statistiques « Nuitées touristiques et hébergement ». https://www.ins.tn/statistiques/130
- **REF-INPDP-LAW :** Instance Nationale de Protection des Données Personnelles, Loi organique n° 2004-63 du 27 juillet 2004, portant sur la protection des données à caractère personnel. https://www.inpdp.tn/ressources/loi_2004.pdf
- **REF-INPDP-FORMS :** Instance Nationale de Protection des Données Personnelles, procédures de déclaration et d'autorisation préalables au traitement des données personnelles. https://www.inpdp.tn/Formulaires.html

### Normes techniques et documentations officielles

- **REF-IETF-ICAL :** Internet Engineering Task Force, RFC 5545, « Internet Calendaring and Scheduling Core Object Specification (iCalendar) ». https://datatracker.ietf.org/doc/html/rfc5545
- **REF-FASTAPI-SECURITY :** Documentation officielle de FastAPI, « OAuth2 with Password (and hashing), Bearer with JWT tokens ». https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- **REF-ALEMBIC :** Projet SQLAlchemy, documentation officielle d'Alembic. https://alembic.sqlalchemy.org/en/latest/
- **REF-OWASP-ASVS :** Fondation OWASP, standard de vérification de la sécurité des applications (*Application Security Verification Standard*). https://owasp.org/www-project-application-security-verification-standard/
- **REF-OWASP-SESSION :** Fondation OWASP, aide-mémoire sur la gestion des sessions utilisateur (*Session Management Cheat Sheet*). https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **REF-OPENAI-EVALS :** Documentation officielle de l'API OpenAI, framework d'évaluation Evals. https://platform.openai.com/docs/api-reference/evals

### Sources internes du projet

- Fichier racine `README.md`
- Instructions d'ingénierie logicielle `AGENTS.md`
- Spécification d'architecture `docs/architecture.md`
- Charte graphique et système de conception `docs/design-system.md`
- Spécification de style `design_system.md`
- Rapport initial d'opportunité `VacayOps_Project_Report.pdf`
- Document de conception et schéma de données `VacayOps_Conception_and_Database_Design.pdf`
- Tickets du dépôt GitHub et tableau de bord de projet « app features »

## Politique de Citation

- Privilégier les sources publiques officielles pour les statistiques macroéconomiques, les standards techniques, les textes réglementaires et les protocoles logiciels.
- Relever et consigner les dates exactes de consultation lors de la génération définitive du document PDF, conformément aux exigences universitaires.
- Proscrire formellement la reconduction d'estimations empiriques non étayées ou d'affirmations comparatives issues de versions préliminaires sans vérification rigoureuse.
- Référencer les témoignages d'entretiens exploratoires au moyen d'identifiants de participants anonymisés accompagnés des dates de réalisation de l'enquête.
- Établir une démarcation nette et transparente entre les décisions d'architecture propres au projet et les faits techniques ou scientifiques attestés par des sources tierces.

## Glossaire

| Terme | Définition dans le cadre de Vayca |
|---|---|
| Agence (*Agency*) | Entreprise exploitant un portefeuille de logements de vacances pour son propre compte ou au nom de multiples propriétaires tiers. |
| Propriétaire indépendant (*Independent owner*) | Client professionnel de dimension réduite, modélisé au sein de Vayca via un espace entreprise (*Company*) standard doté d'une volumétrie adaptée. |
| Disponibilité (*Availability*) | État binaire indiquant l'absence totale de réservation confirmée ou de période de blocage sur un logement pour un intervalle de dates donné. |
| Réservation (*Booking*) | Enregistrement structuré d'un séjour voyageur, qu'il résulte de l'ingestion d'un flux externe ou d'une saisie manuelle directe par le gestionnaire. |
| Période bloquée (*Blocked period*) | Plage de dates du calendrier rendue indisponible à la location, sans comporter nécessairement l'ensemble des métadonnées d'une réservation voyageur. |
| Canal (*Channel*) | Point de connexion bidirectionnel ou flux associant une propriété à une plateforme tierce de réservation ou de distribution de calendrier. |
| Agent conversationnel (*Chatbot*) | Module logiciel d'intelligence artificielle assurant le traitement automatisé et contrôlé des messages échangés avec les voyageurs. |
| Entreprise / Locataire (*Company / Tenant*) | Frontière logique fondamentale d'isolation multi-locataire englobant les utilisateurs, les propriétés, les prestataires et les flux opérationnels. |
| Conflit de dates (*Conflict*) | Chevauchement temporel non autorisé entre plusieurs réservations ou périodes de blocage actives affectant le même hébergement. |
| Prestataire de maintenance (*Contractor*) | Intervenant technique ou artisan externe référencé dans l'annuaire, ne disposant d'aucun compte d'accès utilisateur à l'application Vayca. |
| Escalade managériale (*Escalation*) | Mécanisme de déroutement immédiat d'une conversation voyageur vers la boîte de réception pour traitement exclusif par un opérateur humain. |
| Ancrage contextuel (*Grounding*) | Principe de limitation stricte des réponses de l'IA aux seules directives opérationnelles vérifiées de la propriété et aux faits retournés par le système. |
| Format iCalendar (*iCal*) | Standard international d'interopérabilité et d'échange de données de calendrier et d'agendas, régi par la spécification RFC 5545 de l'IETF. |
| Idempotence (*Idempotency*) | Propriété mathématique et logicielle garantissant que l'exécution répétée d'une même opération ne produit aucun effet secondaire indésirable. |
| Gestionnaire (*Manager*) | Utilisateur authentifié détenant l'ensemble des privilèges d'administration et de supervision opérationnelle de son entreprise. |
| Place de marché (*Marketplace*) | Plateforme publique transactionnelle grand public dédiée à la recherche et au paiement en ligne ; expressément exclue du périmètre MVP de Vayca. |
| Architecture multi-locataire (*Multi-tenancy*) | Architecture logicielle au sein de laquelle une unique instance applicative dessert plusieurs entreprises clientes aux données hermétiquement étanches. |
| Personnel opérationnel (*Staff*) | Utilisateur authentifié en charge de la gestion logistique courante, sans disposer des privilèges d'administration avancés du gestionnaire. |
| Ticket d'intervention (*Ticket*) | Entité formalisant le signalement, l'attribution, le suivi des coûts et la résolution d'une panne ou d'une tâche de maintenance. |
| Webhook | Mécanisme de communication HTTP asynchrone par lequel une plateforme externe (ex. Meta) notifie Vayca de la survenance d'un événement. |

## Registre des Décisions

| ID | Date | Statut | Décision | Justification / Conséquence |
|---|---|---|---|---|
| DEC-001 | 2026-07-28 | Acceptée | Vayca demeure strictement positionné comme une plateforme d'opérations logicielles B2B. | Écarte la complexité disproportionnée des places de marché grand public et préserve la focalisation sur les douleurs opérationnelles des gestionnaires. |
| DEC-002 | 2026-07-28 | Acceptée | Les propriétaires indépendants partagent la même architecture entreprise et bénéficieront ultérieurement d'un abonnement adapté. | Supprime le besoin d'un second modèle de données ou d'une base scindée, garantissant l'évolutivité du modèle SaaS. |
| DEC-003 | 2026-07-28 | Rejetée pour le MVP | Développement d'une place de marché publique grand public avec tunnel d'achat et paiement direct. | Introduirait des exigences complexes de référencement, de gestion des paiements, d'annulations, d'avis et de support aux voyageurs hors périmètre. |
| DEC-004 | 2026-07-28 | Acceptée | Les prestataires externes de maintenance ne disposent d'aucun compte d'accès authentifié à la plateforme. | Le personnel opérationnel enregistre l'affectation des interventions et communique avec les techniciens par les canaux téléphoniques ou SMS habituels. |
| DEC-005 | 2026-07-28 | Acceptée | L'arborescence de navigation principale est unifiée en six modules : Tableau de bord, Calendrier, Messages, Maintenance, Propriétés et Paramètres. | Réduit le jargon technique, élimine la dispersion des fonctionnalités et fluidifie l'apprentissage ergonomique des opérateurs. |
| DEC-006 | 2026-07-28 | Acceptée | Le protocole iCalendar constitue le vecteur prioritaire pour l'intégration des flux de réservation distants. | Standard universellement supporté par les plateformes (Airbnb, Booking.com), suffisant pour la synchronisation des disponibilités, malgré une latence inhérente. |
| DEC-007 | 2026-07-28 | Acceptée | L'intégration de WhatsApp est architecturée autour d'un simulateur local, d'un mode test fournisseur puis d'une connexion de production. | Rend le développement et la validation autonomes face aux délais d'agrément commercial de Meta ou aux pannes de connectivité réseau. |
| DEC-008 | 2026-07-28 | Acceptée | L'appellation normalisée au sein de l'interface graphique est « Chatbot ». | Notion bien plus claire et intuitive pour les gestionnaires et personnels sur le terrain que les désignations d'assistant IA ou d'agent autonome. |
| DEC-009 | 2026-07-28 | Acceptée | Le chatbot répond exclusivement aux requêtes vérifiées, consulte les outils backend et déclenche une escalade humaine sur les cas sensibles ou incertains. | Prévient tout risque d'engagement contractuel erroné ou de réponse autonome sur des situations financières, juridiques ou urgentes. |
| DEC-010 | 2026-07-28 | Acceptée | Toute création ou affectation de ticket de maintenance issue d'une suggestion du chatbot exige une confirmation humaine explicite. | Maintient la pleine responsabilité et le pouvoir d'arbitrage logistique entre les mains du personnel d'exploitation. |
| DEC-011 | 2026-07-28 | Acceptée | Les langues supportées par le chatbot pour le MVP sont le français, l'anglais et l'arabe standard, avec banc d'essai ciblé pour l'arabe tunisien (*derja*). | Répond à la réalité multilingue du marché touristique tunisien tout en contenant la complexité d'ingénierie des invites de modèle. |
| DEC-012 | 2026-07-28 | Acceptée | La saisie des réservations directes et manuelles est nativement intégrée sans transformer le produit en place de marché. | Permet aux exploitants de consigner et bloquer les séjours réservés par téléphone ou via des échanges WhatsApp directs. |
| DEC-013 | 2026-07-30 | Acceptée | L'authentification utilise le hachage de mots de passe Argon2id et des jetons de session opaques révocables stockés en base et transmis par cookies sécurisés. | Évite l'exposition de jetons dans le stockage local du navigateur (Web Storage) et garantit la capacité d'invalidation immédiate côté serveur. |
| DEC-014 | 2026-07-28 | Acceptée | La documentation académique et technique de référence initiale est rédigée en langue anglaise. | Choix méthodologique arrêté par l'équipe pour harmoniser les livrables d'ingénierie logicielle. |
| DEC-015 | 2026-07-28 | Acceptée | Le corpus documentaire constitue une base de référence vivante et évolutive, non un ensemble figé de dogmes immuables. | Les apprentissages de l'implémentation et les validations empiriques sur le terrain sont appelés à ajuster les spécifications. |
| DEC-016 | 2026-08-22 | Acceptée | Ancrage systématique des réponses du modèle d'IA et traitement différé des flux de réponses. | Les règles de politique de sécurité et les données d'entreprise sont évaluées avant tout appel au modèle ; le simulateur garantit le déterminisme des tests. |
| DEC-017 | 2026-08-28 | Acceptée | La vue de détail d'une propriété interroge directement les réservations réelles du calendrier en backend. | Élimine définitivement toute dépendance à des données fictives sur les vues authentifiées et garantit des états d'interface fidèles. |
| DEC-018 | 2026-09-17 | Acceptée | Report des entretiens empiriques de terrain auprès des clients vers la feuille de route post-MVP (maintenu comme ticket ouvert #34). | Maintient la focalisation du MVP sur l'implémentation logicielle vérifiée et les tests automatisés, tout en conservant le cadre de recherche pour les pilotes opérationnels futurs. |

## Décisions Ouvertes

| ID | Décision requise | Discussion responsable |
|---|---|---|
| OPEN-001 | Résolue par la Décision 0003 : jetons de session opaques, stockage haché côté serveur et transmission par cookies sécurisés. | Clôturée le 2026-07-30 |
| OPEN-002 | Définition du périmètre d'unicité de l'adresse e-mail des utilisateurs : portée globale à la plateforme ou cloisonnée par entreprise. | Arbitrage conjoint base de données et expérience utilisateur (UX). |
| OPEN-003 | Stratégie définitive de redondance de la clé d'entreprise (*company_id*) sur les tables relationnelles descendantes. | Revue d'architecture logicielle et de modélisation relationnelle. |
| OPEN-004 | Sémantique précise de gestion des fuseaux horaires sur les heures d'arrivée et de départ des séjours. | Revue conjointe du module calendrier et de la persistance des données. |
| OPEN-005 | Politique de gestion des réservations locales lors de la disparition inattendue d'un événement dans un flux iCalendar distant. | Campagne de tests d'intégration et qualification du calendrier. |
| OPEN-006 | Règles d'unification de l'identité voyageur et critères formels de clôture et réouverture d'une conversation. | Revue conjointe du module de messagerie et de la persistance relationnelle. |
| OPEN-007 | Résolue par la Décision 0009 : cycle de vie unidirectionnel strict des tickets d'intervention et clôture terminale des assignations. | Clôturée le 2026-08-24 |
| OPEN-008 | Choix définitif du fournisseur d'API et du modèle de fondation de langage pour le déploiement en production. | La décision 0008 pose l'architecture d'adaptateur ; le choix final dépend des résultats sur le banc d'évaluation (*evals*). |
| OPEN-009 | Choix de la plateforme d'hébergement cloud et topologie de déploiement pour la mise en exploitation. | Revue conjointe d'infrastructure et d'ingénierie de déploiement. |
| OPEN-010 | Modèle de mise en page institutionnel et normes bibliographiques imposées par l'école pour le mémoire de PFE. | Confirmation préalable auprès des encadrants pédagogiques. |

## Liste de Contrôle pour la Finalisation

- [x] Cadre d'exploration client et pilote post-MVP défini et tracé sous le ticket ouvert #34
- [ ] Mettre en parfaite conformité le schéma relationnel de production et les migrations Alembic avec le chapitre de conception de données.
- [ ] N'insérer de captures d'écran dans le rapport qu'à partir des écrans pleinement connectés aux API réelles.
- [ ] Consigner les résultats métriques définitifs des suites de tests et les temps de réponse observés.
- [ ] Synchroniser l'état d'avancement des tickets GitHub avec la matrice de traçabilité des exigences.
- [ ] Formaliser et enregistrer l'ensemble des arbitrages d'architecture et d'ajustement du périmètre.
- [ ] Valider la conformité réglementaire relative à la protection des données personnelles sur les données du pilote.
- [ ] Appliquer rigoureusement la charte typographique et les directives de mise en page de l'institution académique.
- [ ] Générer l'ensemble des diagrammes d'architecture et de flux (Mermaid) dans un format haute définition adapté à l'édition.
- [ ] Compiler et procéder à l'inspection visuelle minutieuse du recueil documentaire consolidé au format PDF.
