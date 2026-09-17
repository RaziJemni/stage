# Chapitre 01 : Vue d'Ensemble du Projet

**Statut :** Spécification académique de référence validée (Version 1.1.0)

## Identité du Projet

**Nom du projet :** Vayca  
**Ancien nom de travail :** VacayOps  
**Domaine :** Technologies immobilières (PropTech), opérations hôtelières et intelligence artificielle appliquée  
**Marché principal :** Tunisie (Sidi Bou Saïd, La Marsa, Gammarth, Djerba)  
**Cadre de réalisation :** Projet de Fin d'Études / Stage d'Ingénieur en Génie Logiciel  

## Résumé Exécutif

Vayca est une plateforme logicielle web B2B conçue pour les agences de gestion locative saisonnière et les propriétaires indépendants de résidences de vacances. Son objectif fondamental est de réduire la fragmentation opérationnelle en centralisant, au sein d'un espace de travail unifié, la visibilité des réservations, la base de connaissances des propriétés, les communications avec les voyageurs, l'assistance par agent conversationnel (chatbot) et le suivi des interventions de maintenance.

Le projet résout trois problématiques opérationnelles récurrentes identifiées sur le terrain :

1. **Fragmentation des flux de réservation :** Les réservations sont dispersées entre de multiples canaux (Airbnb, Booking.com, Vrbo, réservations directes), ce qui engendre des retards de synchronisation et des risques critiques de surréservation (*double-booking*).
2. **Gestion multilingue et répétitive des demandes voyageurs :** Les voyageurs communiquent via des canaux de messagerie instantanée (principalement WhatsApp) en plusieurs langues (français, anglais, arabe, dialecte tunisien, italien, allemand) et exigent des réponses immédiates et spécifiques à chaque villa (code Wi-Fi, horaires de check-in, équipements).
3. **Coordination informelle et opaque de la maintenance :** Les signalements d'incidents sont généralement gérés via des conversations informelles non structurées, sans attribution claire aux prestataires, sans suivi d'état ni traçabilité financière déductible.

Le produit délivre un calendrier global de portefeuille, une synchronisation asynchrone des flux iCalendar, la détection proactive des conflits de réservation, une boîte de réception unifiée des messages, un chatbot multilingue avec règles d'escalade strictes, un référentiel de propriétés, un module de gestion des tickets d'intervention et un tableau de bord de supervision managériale.

## Positionnement du Produit

Vayca n'est pas une place de marché publique (*marketplace* d'hébergement). Les voyageurs découvrent et réservent les logements via des plateformes tierces existantes (Airbnb, Booking.com) ou par contact direct. Vayca opère en coulisses comme la station de travail opérationnelle du gestionnaire ou de l'agence.

La même architecture logicielle dessert à la fois les agences et les propriétaires indépendants :

- **Une agence** est modélisée sous forme d'entreprise (*Company*) regroupant plusieurs utilisateurs (gestionnaires et personnel opérationnel) et un parc étendu de propriétés.
- **Un propriétaire indépendant** est représenté sous la même entité entreprise avec un nombre restreint d'utilisateurs et de villas.
- La tarification de l'abonnement SaaS peut varier ultérieurement sans imposer de divergence architecturale ni de second schéma de base de données.

## Objectifs du Projet

### Objectifs Académiques

- Appliquer l'ingénierie des exigences et la modélisation UML rigoureuse à un cas opérationnel réel et complexe.
- Concevoir et implémenter une application web modulaire et robuste au sein d'une équipe coordonnée.
- Mettre en pratique la conception de bases de données relationnelles multi-locataires (*multi-tenancy*), les architectures d'API RESTful, le traitement asynchrone par files de messages, l'intégration sécurisée de modèles d'IA, les tests automatisés et le déploiement conteneurisé.
- Produire une documentation technique et académique traçable reliant les besoins métiers, les spécifications fonctionnelles, la conception logicielle et les jeux de tests.

### Objectifs Fonctionnels

- Centraliser les propriétés, réservations, conversations et opérations de maintenance.
- Importer automatiquement les flux de calendrier et identifier les chevauchements de dates.
- Répondre automatiquement aux questions courantes des voyageurs à l'aide de faits vérifiés et des disponibilités réelles du backend (*grounding* contextuel).
- Transférer immédiatement les conversations sensibles, incertaines ou conflictuelles aux opérateurs humains (*escalade managériale*).
- Structurer les pannes sous forme de tickets de maintenance avec historique immuable et attribution de prestataires externes.
- Offrir aux managers une vision consolidée des points d'attention prioritaires, des arrivées et des départs du jour.

### Objectifs de Qualité Logicielle

- Garantir une ergonomie adaptée aux opérateurs mobiles et de bureau, éliminant les latences tactiles et respectant les zones d'affichage (*PWA*).
- Assurer une isolation stricte des données entre locataires (*tenant isolation*) au niveau de chaque requête de base de données.
- Imposer l'idempotence des événements externes pour éviter toute duplication lors de réémissions de webhooks.
- Maintenir la transparence sur l'état des intégrations tierces et offrir des mécanismes de récupération sur panne.
- Garantir que toute réponse générée par l'IA est vérifiable, journalisée et conforme à la politique de sécurité.

## Contribution Attendue

La valeur ajoutée du projet réside dans l'orchestration cohérente et localisée de plusieurs processus opérationnels au sein d'une interface adaptée aux spécificités tunisiennes (gestion en dinars tunisiens TND, bilinguisme français/anglais, intégration WhatsApp). Sa contribution ne réside pas dans l'invention isolée d'un calendrier ou d'un système de tickets, mais dans l'intégration harmonieuse de ces briques autour du quotidien des gestionnaires de biens.

## Niveau de Maturité Actuel (Baseline v1.1.0)

À ce jour, la plateforme dispose d'une implémentation entièrement fonctionnelle et vérifiée sur l'ensemble de ses modules fondamentaux :
- **Persistance et isolation multi-locataire :** Base PostgreSQL avec 13 migrations versionnées via Alembic.
- **Authentification et contrôle d'accès :** Rôles Manager et Staff, sessions chiffrées par cookies opaques, protection CSRF, invitations par e-mail et assignation granulaire de propriétés.
- **Gestion du portefeuille :** Gestion CRUD des propriétés, directives d'accueil, consignes d'accès, attribution multi-propriétaires et archivage doux.
- **Calendrier et moteur tarifaire :** Saisie de réservations manuelles/directes, devis calculés par le serveur, reçus imprimables A4 au format TND, synchronisation asynchrone de flux iCalendar (Airbnb, Booking.com, Vrbo, Expedia) et détection automatique des conflits.
- **Boîte de messagerie et IA groundée :** Boîte partagée, adaptateur WhatsApp multi-fournisseur (simulateur local, Cloud API Meta, Twilio), réponses IA multilingues ancrées, prise en main manuelle par le personnel et suivi des états de lecture partagés.
- **Maintenance et prestataires :** Kanban d'interventions, répertoire des prestataires, confirmation des suggestions de tickets par l'IA, suivi des coûts de réparation déductibles et notifications aux voyageurs.
- **Portail Propriétaire et supervision :** Relevés de reversement mensuels automatisés, portail web sécurisé par jetons cryptographiques SHA-256 (`/owner/statements?token=...`) et exportations CSV.
- **Ergonomie Mobile PWA :** Application Web Progressive avec manifeste W3C, guide d'installation responsive et suppression des latences tactiles.
- **Simulateur WhatsApp Web et QR Code :** Interface voyageur responsive (`/simulator/whatsapp`) avec génération vectorielle de QR code en pur TypeScript pour les démonstrations de soutenance.
- **Validation automatisée :** 136 tests backend (`pytest`) et 132 tests frontend (`vitest`) avec un taux de réussite de 100%, et validation CI complète.
