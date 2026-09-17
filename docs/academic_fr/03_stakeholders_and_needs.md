# Chapitre 03 : Parties Prenantes et Analyse des Besoins

**Statut :** Spécification de référence validée

## Cartographie des Parties Prenantes

| Partie prenante | Relation avec Vayca | Besoins fondamentaux |
|---|---|---|
| Gestionnaire de propriétés (*Manager*) | Utilisateur principal authentifié | Pilotage global du portefeuille, alertes opérationnelles, gestion des utilisateurs, des propriétés et des affectations |
| Personnel opérationnel (*Staff*) | Utilisateur opérationnel authentifié | Traitement des messages, consultation des réservations et des propriétés, suivi des interventions de maintenance |
| Propriétaire indépendant | Gestionnaire authentifié d'un compte entreprise à échelle restreinte | Mêmes flux de travail fondamentaux, adaptés à une volumétrie et une tarification simplifiées |
| Voyageur (*Guest*) | Acteur externe sans compte Vayca | Réponses rapides, claires et exactes via WhatsApp |
| Prestataire technique (*Contractor*) | Contact externe référencé sans compte Vayca | Transmission claire des détails d'intervention via les canaux de communication usuels (téléphone, WhatsApp) |
| Agent conversationnel (*Chatbot*) | Capacité logicielle automatisée et sous contrôle managérial | Contexte vérifié et ancré (*grounding*), catalogue d'actions autorisées, règles strictes d'escalade humaine |
| Canal de réservation (OTA) | Système externe tiers | Échange de données de calendrier via les protocoles standardisés pris en charge (iCalendar) |
| Fournisseur de service WhatsApp | Système externe tiers | Acheminement bidirectionnel des messages et notification d'événements via webhooks |
| Encadrement pédagogique et professionnel | Gouvernance académique et industrielle | Démarche méthodologique rigoureuse, traçabilité des exigences et justification documentée des choix d'ingénierie |
| Équipe de développement | Concepteurs et mainteneurs du système | Contrats d'interfaces stables, délimitation stricte des modules, environnement de développement reproductible |

## Profils Utilisateurs

### Gestionnaire de propriétés (*Manager*)

Le gestionnaire supervise l'ensemble du parc immobilier et assume la responsabilité opérationnelle de la disponibilité des logements, de la qualité de service aux voyageurs, de l'état de maintenance et de la coordination des équipes. L'interface qui lui est destinée doit faire ressortir en priorité les anomalies, urgences et décisions à arbitrer, plutôt que la configuration technique sous-jacente.

### Membre du personnel opérationnel (*Staff*)

Le personnel d'exploitation assure la gestion courante au quotidien. Il requiert un accès direct et rapide au contexte des voyageurs, aux fiches détaillées des propriétés, aux plannings d'arrivées et de départs, ainsi qu'au suivi des pannes. Sauf délégation explicite, ses droits d'accès n'incluent ni la gestion des comptes utilisateurs de l'entreprise, ni la configuration sensible des intégrations tierces.

### Propriétaire indépendant

Le propriétaire indépendant exécute les mêmes processus métiers que le gestionnaire d'agence, mais opère sur un portefeuille réduit et gère souvent son activité de manière autonome. L'architecture logicielle ne doit pas introduire de profil d'accès distinct ni d'application séparée : la simplification du parcours d'inscription et de la tarification relève d'une politique commerciale et non d'une divergence technique.

### Voyageur (*Guest*)

Le voyageur ne se connecte jamais directement à la plateforme Vayca. Ses interactions s'effectuent exclusivement à travers son application de messagerie WhatsApp habituelle, lui permettant d'obtenir des informations et des mises à jour sans avoir à appréhender le système interne.

### Prestataire technique (*Contractor*)

Le prestataire externe (plombier, électricien, agent d'entretien) est répertorié en tant que contact rattaché à l'entreprise mais ne dispose d'aucun compte d'authentification. Dans le cadre du MVP, les membres de l'équipe sélectionnent le prestataire approprié et lui transmettent manuellement les détails de la mission par appel téléphonique ou message WhatsApp.

## Besoins Utilisateurs Fondamentaux

### Besoins du Gestionnaire (*Manager*)

- Identifier immédiatement les situations requérant une attention prioritaire au quotidien.
- Disposer d'une vue fiable et intègre des disponibilités sur l'ensemble du parc immobilier.
- Détecter sans délai les chevauchements et conflits de réservation.
- Maîtriser et administrer les habilitations du personnel opérationnel.
- Superviser les conversations ayant fait l'objet d'une escalade humaine.
- Assurer le suivi et la résolution des tickets de maintenance pendants.

### Besoins du Personnel Opérationnel (*Staff*)

- Retrouver instantanément les données et consignes spécifiques à une propriété donnée.
- Visualiser clairement si un échange est pris en charge par l'agent conversationnel ou par un opérateur humain.
- Reprendre la main manuellement sur une conversation en toute sécurité.
- Convertir une anomalie signalée par un voyageur en ticket d'intervention structuré.
- Consigner l'affectation du prestataire et tracer l'état d'avancement des réparations.

### Besoins du Voyageur (*Guest*)

- Obtenir des réponses promptes et intelligibles dans sa langue d'expression.
- Recevoir des informations fiables et exactes concernant le logement et ses disponibilités.
- Pouvoir solliciter et joindre facilement un interlocuteur humain en cas de requête sensible, complexe ou exceptionnelle.
- Être tenu informé de façon claire et régulière du traitement de ses signalements d'incidents.

## Principes d'Ergonomie et d'Utilisabilité

1. Employer la terminologie opérationnelle du métier plutôt que le jargon technique d'implémentation.
2. Placer les anomalies et les actions requises au premier plan, avant les statistiques secondaires.
3. Restreindre la navigation principale aux six vues maîtresses : Tableau de bord, Calendrier, Messages, Maintenance, Propriétés et Paramètres.
4. Présenter les fiches de propriétés et les fils de discussion sous forme de vues détaillées imbriquées (*drill-down views*).
5. Combiner systématiquement code couleur, pictogramme et libellé textuel pour chaque état ou statut significatif.
6. Ne jamais contraindre les utilisateurs finaux à appréhender des concepts techniques complexes tels que RAG, OTA, webhook ou Kanban.
7. Soumettre impérativement toute action critique proposée par l'agent conversationnel à une validation humaine préalable.

## Cadre d'Exploration Client et d'Entretiens de Terrain (Ticket #34)

**Statut :** Protocole formalisé et validé ; en attente de déploiement sur le terrain (stricte interdiction de données clients fictives).

Afin d'ancrer les spécifications fonctionnelles du produit et l'étude de marché dans la réalité opérationnelle observée en Tunisie, la présente section définit le protocole d'enquête de terrain, les critères de sélection des cohortes cibles, les garanties éthiques de confidentialité et la matrice standardisée de recueil des données.

### Cohortes Cibles et Critères de Recrutement

| Cohorte | Description | Échantillon Cible | Critères de Recrutement |
|---|---|---|---|
| **Cohorte A : Gestionnaires de Petites Agences** | Gestionnaires professionnels opérant un parc multi-propriétés dans les pôles touristiques côtiers et urbains tunisiens. | 3–4 agences | • Entre 3 et 25 logements sous gestion.<br>• Annonces actives sur au moins deux canaux distincts (ex. Airbnb, Booking.com, réservations directes).<br>• Présence d'au moins un coordinateur ou membre du personnel opérationnel. |
| **Cohorte B : Propriétaires Indépendants** | Propriétaires particuliers gérant en direct leurs résidences secondaires ou villas de vacances. | 2–3 propriétaires | • Entre 1 et 4 propriétés en location saisonnière.<br>• Prise en charge directe de la communication avec les voyageurs et de la maintenance.<br>• Usage de WhatsApp et gestion de demandes directes locales. |

**Pôles Géographiques Ciblés :** Sousse / Monastir, Tunis / La Marsa / Sidi Bou Saïd, Nabeul / Hammamet et Djerba.

### Protocole Éthique et Protection des Données Personnelles

Conformément aux dispositions de la Loi organique tunisienne n° 2004-63 relative à la protection des données à caractère personnel [REF-INPDP-LAW] :
- **Consentement éclairé :** Les participants sont préalablement informés des finalités strictement académiques et d'ingénierie de l'étude avant la conduite de l'entretien.
- **Anonymisation :** Les dénominations commerciales, identités du personnel, adresses exactes des propriétés et chiffres financiers confidentiels sont masqués et substitués par des identifiants synthétiques neutres (ex. `Agence-Sousse-01`, `Proprietaire-Tunis-01`).
- **Confidentialité :** Les enregistrements sonores et notes brutes d'entretien sont strictement cantonnés à l'équipe de recherche et seront détruits à l'issue de l'évaluation académique du PFE.

### Guide d'Entretien Semi-Directif

La grille d'entretien est articulée autour de six axes thématiques majeurs, pour une durée estimée de 30 à 45 minutes :

#### Section 1 : Profil du Parc Immobilier et de l'Équipe
1. Combien de propriétés gérez-vous actuellement, et de quelles typologies (appartements, villas de bord de mer, dars traditionnels) ?
2. Combien de collaborateurs assurent la gestion quotidienne des opérations, la messagerie et les arrivées (*check-ins*) ?
3. De quelle manière la saisonnalité impacte-t-elle votre taux d'occupation et votre charge opérationnelle (haute saison estivale vs basse saison) ?

#### Section 2 : Gestion des Canaux et Synchronisation des Réservations
4. Quels canaux mobilisez-vous pour recevoir vos réservations (Airbnb, Booking.com, Vrbo, appels directs/WhatsApp, réseaux sociaux) ?
5. Comment assurez-vous actuellement la synchronisation des calendriers et disponibilités entre ces différentes plateformes ?
6. Avez-vous déjà été confronté à des surréservations (*double-bookings*) ou chevauchements de dates ? Quelles en ont été les conséquences financières ou opérationnelles ?
7. Selon quel processus traitez-vous les réservations directes ou manuelles (clients de passage, habitués, recommandations) ?

#### Section 3 : Communication Voyageurs et Gestion Multilingue
8. Quel est le volume quotidien moyen de messages et demandes de voyageurs reçus en période de haute saison ?
9. Quelles sont les langues employées par vos voyageurs (français, anglais, dialecte tunisien, arabe standard, italien, allemand) ?
10. Quelles sont les questions récurrentes les plus fréquentes (code Wi-Fi, itinéraire d'accès, horaires d'arrivée, règlement intérieur, entretien de la piscine) ?
11. Quel est votre positionnement quant à la prise en charge des questions récurrentes par un agent conversationnel automatisé, sous réserve qu'il transfère immédiatement à un opérateur humain toute réclamation ou demande de paiement ?

#### Section 4 : Maintenance et Coordination des Prestataires
12. Selon quelles modalités tracez-vous actuellement les pannes et dysfonctionnements signalés par les voyageurs (ex. climatisation en panne, fuite d'eau) ?
13. Comment mandatez-vous et suivez-vous les interventions des artisans locaux (plombiers, électriciens, agents d'entretien) ?
14. Quelle est la principale difficulté rencontrée pour tenir les voyageurs informés de la progression des interventions techniques ?

#### Section 5 : Outils Existants et Environnement Logiciel
15. Quels progiciels, applications ou tableurs utilisez-vous à ce jour pour gérer vos opérations ?
16. Quel est votre niveau de dépenses mensuelles consacré aux logiciels de gestion locative ou gestionnaires de canaux ?
17. Quels sont les principaux facteurs d'insatisfaction liés aux solutions actuelles (complexité, absence de support linguistique local, absence d'intégration WhatsApp, coût élevé) ?

#### Section 6 : Hiérarchisation des Fonctionnalités et Consentement à l'Adoption
18. Si un espace de travail centralisé unifiait votre calendrier, vos échanges WhatsApp, la réponse automatique aux questions d'accueil (Wi-Fi, check-in) et le suivi des pannes, quelle fonctionnalité vous apporterait la valeur immédiate la plus forte ?
19. Quel montant d'abonnement mensuel en Dinars Tunisiens (TND) jugeriez-vous raisonnable au vu de la taille de votre parc ?
20. Quels seraient vos principaux freins ou réticences avant d'adopter une telle plateforme ?

### Grille Standardisée de Recueil des Données (En Attente d'Exécution sur le Terrain)

Lorsque les entretiens auront été réalisés, les données collectées seront consignées dans la grille standardisée suivante :

| Identifiant Participant | Rôle & Région | Taille du Portefeuille | Principaux Canaux | Goulot d'Étranglement Majeur | Logiciels Actuels / Coût | Position vis-à-vis du Chatbot | Gestion de la Maintenance | Consentement Déclaré à Payer |
|---|---|---|---|---|---|---|---|---|
| `[P01 en attente]` | Gestionnaire d'Agence (Sousse) | *Cible : 8–15 logements* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* |
| `[P02 en attente]` | Gestionnaire d'Agence (Tunis) | *Cible : 5–10 logements* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* |
| `[P03 en attente]` | Propriétaire Indépendant (Hammamet) | *Cible : 2–3 villas* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* |
| `[P04 en attente]` | Coordinateur d'Agence (Djerba) | *Cible : 10–20 logements* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* |
| `[P05 en attente]` | Propriétaire Indépendant (Tunis) | *Cible : 1–2 appartements* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* | *À renseigner* |

### Cadre d'Analyse des Tendances et de Synthèse

À la suite de la réalisation effective des entretiens, l'équipe procédera à la synthèse des tendances récurrentes selon quatre axes d'analyse :
1. **Validation des difficultés effectives vs Invalidation des hypothèses initiales :** Confirmer si la synchronisation manuelle des calendriers et la gestion des messages en dehors des heures ouvrées constituent de véritables points de friction quotidiens pour l'ensemble des cohortes.
2. **Capacités fondamentales vs Fonctionnalités secondaires :** Vérifier si le périmètre du MVP répond fidèlement aux priorités des gestionnaires ou si certaines fonctionnalités (ex. portail d'accès pour les prestataires, paiements en ligne) doivent être formellement différées.
3. **Risques opérationnels et freins à l'adoption :** Recenser les objections pratiques relatives à la fiabilité de l'IA, à la connectivité Internet et à l'effort d'intégration dans les pratiques d'équipe.
4. **Calibration du modèle économique :** Aligner les grilles tarifaires destinées aux propriétaires indépendants et aux agences sur les seuils réels de consentement à payer constatés en Dinars Tunisiens (TND).
