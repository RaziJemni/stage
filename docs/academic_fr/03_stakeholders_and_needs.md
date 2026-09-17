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


