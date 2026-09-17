# Chapitre 02 : Contexte et Étude de l'Existant

**Statut :** Version préliminaire de travail ; les constats de marché requièrent une validation continue sur le terrain

## Contexte Sectoriel

Le tourisme constitue un secteur d'une importance économique majeure en Tunisie, et les opérations d'hébergement touristique se déploient principalement à travers plusieurs grandes régions côtières. Selon les données officielles de l'Institut National de la Statistique (INS) de Tunisie, les dépenses du tourisme récepteur et intérieur se sont élevées en 2024 à 16 122,6 millions de TND, représentant une contribution directe d'environ 5,1 % au Produit Intérieur Brut (PIB) national. Les statistiques officielles du secteur de l'hébergement mettent également en évidence une capacité d'accueil substantielle dans les pôles de Nabeul-Hammamet, Sousse-Kairouan, Yasmine Hammamet, Monastir-Skanès et d'autres régions cibles [REF-INS-CST-2024] [REF-INS-ACCOMMODATION].

Bien que ces indicateurs macroéconomiques corroborent la pertinence d'outils logiciels d'aide à la gestion hôtelière et para-hôtelière, ils ne démontrent pas à eux seuls l'adéquation au marché (*product-market fit*) ni la demande spécifique pour Vayca. La réalisation d'entretiens qualitatifs avec les professionnels, l'observation des processus métiers sur le terrain, le déploiement de projets pilotes et l'évaluation empirique du consentement à payer demeurent des préalables indispensables.

## Situation Opérationnelle Existante

L'hypothèse de travail repose sur le constat que les petites agences de gestion locative ainsi que les propriétaires indépendants composent couramment avec un ensemble hétérogène d'outils disjoints :

- Les tableaux de bord des plateformes de réservation en ligne (Airbnb, Booking.com ou similaires) pour le suivi des réservations ;
- L'exportation et l'importation de flux iCalendar pour une synchronisation rudimentaire des disponibilités ;
- L'application WhatsApp pour l'ensemble des communications directes avec les voyageurs et les prestataires techniques ;
- Des feuilles de calcul (tableurs) ou des notes textuelles pour consigner les détails des propriétés et assurer le suivi opérationnel ;
- Des appels téléphoniques et messages instantanés informels pour l'affectation et le suivi des interventions de maintenance.

Cette organisation empirique présente l'avantage de la flexibilité et de la familiarité d'usage, mais engendre une fragmentation critique de l'information. Pour une même propriété, les dates de séjour résident dans un système de réservation, les consignes d'accès sont isolées dans un fichier bureautique distinct, l'historique des échanges avec le voyageur est dispersé dans un fil de messagerie, et l'état des pannes techniques n'est connu que d'un seul employé sur le terrain.

## Problématiques Observées ou Anticipées

### Fragmentation de la visibilité des réservations

Le personnel d'exploitation est contraint de consulter de multiples sources disparates afin de vérifier la disponibilité d'un logement. Les retards de synchronisation des flux, l'absence de saisie immédiate des réservations manuelles, les annulations imprévues et les périodes de blocage hors calendrier conduisent fréquemment à des vues asynchrones et discordantes, augmentant considérablement le risque de surréservation (*double-booking*).

### Lenteur et hétérogénéité des réponses apportées aux voyageurs

Les demandes d'informations propres à chaque logement parviennent souvent en dehors des heures ouvrées et dans des langues variées. Les équipes doivent alors rechercher manuellement les éléments de réponse pertinents avant de répondre, ce qui accroît les délais de réaction et multiplie les risques d'omission ou d'inexactitude.

### Coordination non structurée des interventions de maintenance

Une anomalie ou une panne signalée par un voyageur au cours d'une conversation est généralement retransmise manuellement à un artisan ou technicien. En l'absence de ticket formel et d'historique de statut, l'attribution des responsabilités, la qualification de l'urgence et la confirmation de la résolution s'avèrent difficiles à tracer et à auditer.

### Absence de vue d'ensemble opérationnelle consolidée

Les gestionnaires et directeurs d'agences requièrent une visibilité synthétique sur les arrivées, les départs, les conflits de calendrier, les conversations nécessitant une escalade managériale et les tickets d'intervention prioritaires. Les tableaux de bord fournis par les canaux de réservation se concentrent exclusivement sur leurs propres réservations et n'offrent aucune vision globale du flux de travail à l'échelle du portefeuille.

## Typologie des Solutions Existantes

### Tableaux de bord des plateformes de réservation (OTA)

Ces interfaces constituent la référence pour les réservations générées sur leurs propres canaux. Toutefois, leur limite majeure dans le cadre de Vayca réside dans le cloisonnement entre plateformes concurrentes et l'absence quasi-totale de prise en charge des flux opérationnels internes et de la maintenance.

### Systèmes de gestion de propriétés (PMS - Property Management Systems)

Les progiciels de gestion de propriétés du marché (*PMS*) proposent généralement des fonctions de gestionnaire de canaux (*channel manager*), de messagerie unifiée, de rapports financiers et d'automatisation. Une grille comparative détaillée de la concurrence doit être actualisée sur la base des offres d'éditeurs afin d'étayer toute assertion quant au support linguistique, à la structure tarifaire ou à leur inadaptation aux spécificités du marché tunisien.

### Outils de messagerie instantanée généralistes

L'application WhatsApp est universellement accessible et familière pour les voyageurs et les prestataires techniques, mais ne permet pas intrinsèquement de relier les échanges aux entités logiques du domaine (propriétés, réservations ou tickets d'intervention).

### Outils généralistes de gestion de tâches

Les tableaux de gestion de tâches (de type Kanban générique) permettent de suivre des listes d'activités, mais imposent une ressaisie manuelle fastidieuse du contexte relatif au voyageur, au logement et à la période de séjour.

## Proposition de Valeur et Amélioration Apportée

Vayca n'a pas vocation à se substituer aux plateformes de réservation publiques. La solution s'articule comme une passerelle d'unification reliant les données opérationnelles en périphérie de ces canaux :

```text
Canaux de réservation -> Calendrier Vayca et détection proactive des conflits
Messages WhatsApp -> Conversations Vayca et flux d'assistance par agent conversationnel (chatbot)
Incidents signalés -> Tickets de maintenance Vayca et traçabilité des assignations
Ensemble des modules -> Tableau de bord Vayca et alertes opérationnelles
```

## Analyse SWOT Préliminaire

| Forces | Faiblesses |
|---|---|
| Flux de travail opérationnels ciblés et spécialisés | Équipe de développement restreinte et en phase de montée en compétences collectives |
| Concept d'agent conversationnel multilingue ancré | Dépendance vis-à-vis des API et services tiers (WhatsApp, modèles d'IA, fournisseurs de messagerie) |
| Prise en compte du contexte local, de la devise (TND) et des spécificités opérationnelles | Absence initiale de clients en production validés sur le terrain |
| Contexte unifié et partagé entre tous les modules métiers | Risque de dérive du périmètre du MVP en l'absence d'une gouvernance stricte |

| Opportunités | Menaces |
|---|---|
| Offre d'abonnement adaptée aux propriétaires indépendants | Accès restreint ou coûteux aux API officielles des plateformes de réservation (Airbnb, Booking.com) |
| Établissement de partenariats pilotes avec des agences immobilières locales | Contraintes d'approbation réglementaires et politiques de tarification de l'API Meta/WhatsApp |
| Potentiel d'extension vers d'autres marchés du Maghreb aux caractéristiques similaires | Risque d'altération de la confiance utilisateur en cas d'hallucinations ou d'inexactitudes du chatbot |
| Intégration future de modules de réservation directe comme extension fonctionnelle | Évolution des éditeurs de PMS établis vers une meilleure localisation et accessibilité tarifaire |

## Travaux de Validation Requis sur le Terrain (Ticket #34)

L'étude de marché et l'analyse des besoins métiers nécessitent une consolidation empirique au moyen d'entretiens qualitatifs menés directement auprès des acteurs du terrain. Le Chapitre 03 (`docs/academic_fr/03_stakeholders_and_needs.md`) détaille le **Cadre d'Exploration Client et d'Entretiens de Terrain**, comprenant la définition des critères de recrutement des cohortes cibles (agences et propriétaires indépendants répartis entre Sousse, Tunis, Hammamet et Djerba), le protocole éthique conforme aux directives de l'INPDP, le guide d'entretien semi-directif articulé autour de 20 questions et la grille standardisée de recueil anonymisé.

Le statut de cette section demeure **Protocole Établi et en Attente d'Exécution sur le Terrain**. Les données réelles recueillies auprès des participants seront intégrées à l'issue des campagnes d'entretiens, dans le respect de l'intégrité académique interdisant toute invention de données empiriques.
