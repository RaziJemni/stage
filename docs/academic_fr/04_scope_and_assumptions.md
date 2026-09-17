# Chapitre 04 : Périmètre et Hypothèses

**Statut :** Spécification de référence validée ; sujette à modification contrôlée

## Définition du Produit Minimum Viable (MVP)

Le Produit Minimum Viable (MVP) est considéré comme achevé dès lors que l'ensemble des flux de travail retenus fonctionnent de bout en bout en s'appuyant sur des données persistantes, un mécanisme d'authentification et d'autorisation, des validations strictes d'entrées et un traitement validé des cas d'erreur. Un prototype purement visuel ou superficiel ne saurait à lui seul satisfaire cette exigence.

## Fonctionnalités Retenues dans le Périmètre (In-Scope)

### Socle Technique et Transversal

- Multi-tenance à l'échelle de l'entreprise (*Company-based multi-tenancy*)
- Comptes de gestionnaires (*Manager*) et de personnel opérationnel (*Staff*)
- Authentification par identifiant e-mail et mot de passe sécurisé
- Autorisation et contrôle d'accès fondé sur les rôles côté backend (*RBAC*)
- Gestion versionnée des migrations de base de données (Alembic)
- Environnement de développement reproductible et conteneurisé sous Docker

### Gestion du Parc Immobilier et Calendrier des Réservations

- Création et mise à jour des fiches de propriétés
- Enregistrement de la base de connaissances et des consignes d'accueil spécifiques à chaque villa
- Configuration des liaisons de flux de calendriers pris en charge
- Importation et rafraîchissement asynchrone des flux iCalendar
- Persistance des réservations et des périodes d'indisponibilité / blocage
- Saisie manuelle des réservations directes
- Détection automatisée des chevauchements de dates et conflits
- Affichage du calendrier consolidé du portefeuille et notification des alertes de conflit

### Communication avec les Voyageurs

- Réception et traitement des messages WhatsApp via une intégration de test réelle ou un simulateur
- Enregistrement et persistance des conversations et de l'historique des messages
- Détection linguistique et formulation de réponses dans les langues supportées
- Prise en charge automatisée des questions courantes sur les propriétés
- Vérification des disponibilités à partir des données réelles du backend
- Escalade systématique vers un opérateur humain en cas de requête sensible, incertaine ou conflictuelle
- Prise en main manuelle sécurisée par le personnel pour répondre directement

### Gestion de la Maintenance

- Création de tickets d'intervention associés aux propriétés et éventuellement rattachés à une réservation
- Suggestion automatisée de création de ticket à partir d'un incident détecté dans un échange voyageur
- Validation humaine obligatoire par le personnel avant toute création effective de ticket ou assignation
- Référencement des coordonnées des prestataires et artisans techniques
- Enregistrement de l'historique immuable des statuts et des affectations
- Préparation ou émission de notifications d'avancement destinées aux voyageurs

### Supervision et Administration

- Tableau de bord synthétique regroupant les points d'attention prioritaires et les opérations quotidiennes
- Système d'alertes et de notifications au sein de l'application
- Paramètres de gestion de l'entreprise et des membres de l'équipe
- Configuration et supervision des canaux de synchronisation des réservations

## Fonctionnalités Strictement Hors Périmètre (Out of Scope)

- Place de marché publique d'hébergement (*marketplace* pour voyageurs)
- Comptes d'accès et authentification pour les voyageurs
- Comptes d'accès et authentification pour les prestataires techniques
- Passerelle de traitement des paiements en ligne
- Interface publique de recherche de biens et de paiement (*checkout*)
- Applications mobiles natives (iOS / Android)
- Tarification dynamique autonome (fondée sur la demande, la concurrence, le remplissage ou les offres de dernière minute) et publication automatique des prix sur les OTA
- Portail propriétaire autonome (*Owner portal* étendu hors MVP initial)
- Outils d'analyse financière et décisionnelle avancée (*revenue analytics*)
- Génération automatisée de rapports comptables PDF pour les propriétaires
- Intégration directe des API spécifiques d'Expedia et VRBO
- Prise en charge des langues italienne et allemande par l'agent conversationnel
- Campagnes automatisées d'incitation au dépôt d'avis clients
- Visites virtuelles des propriétés en 360 degrés

## Hypothèses de Travail

| Identifiant | Hypothèse | Conséquence en cas d'invalidation |
|---|---|---|
| ASM-01 | Les flux de calendrier iCalendar d'Airbnb et de Booking.com sont exportables et accessibles pour les propriétés pilotes | Le recours à un simulateur de flux ou à un mécanisme d'importation manuelle devient indispensable |
| ASM-02 | Une intégration de test de l'API WhatsApp (simulateur ou compte de test sandbox) est exploitable durant la phase de développement | La démonstration et les tests reposeront intégralement sur le simulateur local de webhooks |
| ASM-03 | Les gestionnaires de biens et le personnel opérationnel acceptent une application web responsive comme poste de travail | Des adaptations ergonomiques supplémentaires orientées mobile (PWA avancée) s'avéreront nécessaires |
| ASM-04 | Le français, l'anglais et l'arabe couvrent l'essentiel des besoins linguistiques pour le projet pilote du MVP | Le périmètre linguistique devra faire l'objet d'un élargissement ultérieur |
| ASM-05 | Le personnel de gestion peut contacter manuellement les prestataires et artisans par les canaux habituels (téléphone, WhatsApp) | L'automatisation des notifications aux prestataires deviendra une exigence nouvelle à implémenter |
| ASM-06 | Une entité Entreprise (*Company*) unique permet de modéliser indifféremment une agence ou un propriétaire indépendant | Une modélisation conceptuelle disjointe des profils de compte s'imposerait dans l'architecture |

## Contraintes du Projet

- Équipe de développement restreinte à trois étudiants avec une expérience préalable limitée en ingénierie logicielle collaborative
- Contraintes de calendrier universitaire (période de stage) et exigences de rédaction de la documentation académique
- Dépendance vis-à-vis de la disponibilité opérationnelle, des coûts et des politiques d'accès aux services tiers
- Absence de garantie d'accès aux interfaces partenaires officielles des plateformes de réservation (Airbnb / Booking.com)
- Impératif strict de protection des données personnelles, des consignes d'accès aux logements et de la confidentialité des conversations
- Nécessité de concevoir une ergonomie intuitive et accessible pour des opérateurs métiers non technophiles

## Règle de Contrôle et de Gestion des Évolutions

Toute proposition visant à introduire un nouvel acteur, une page publique, une dépendance externe, une entité en base de données ou une intégration au sein du MVP doit préalablement répondre aux cinq interrogations suivantes :

1. À quel besoin métier validé cette évolution répond-elle ?
2. Quelle exigence existante se trouve modifiée ?
3. Quel module architectural en assure la responsabilité ?
4. Quelle charge de développement et de tests automatisés cette modification induit-elle ?
5. Quelles fonctionnalités sont retirées ou différées afin de garantir le respect des délais ?
