# Chapitre 12 : Modèles UML et Workflows Opérationnels

**Statut :** Modèles de conception éditables ; les diagrammes doivent évoluer avec les exigences approuvées

## Diagramme des Cas d'Utilisation Système

Le diagramme de cas d'utilisation ci-dessous formalise les interactions fonctionnelles entre les acteurs opérationnels et le système Vayca.

```mermaid
flowchart LR
    Manager["Gestionnaire de Propriétés"]
    Staff["Membre du Personnel"]
    Guest["Voyageur"]
    Channel["Canal de Réservation"]
    Chatbot["Chatbot"]

    subgraph Vayca
        Login((S'authentifier))
        Property((Gérer les propriétés))
        Team((Gérer l'équipe))
        Calendar((Consulter le calendrier global))
        Sync((Synchroniser les calendriers))
        Conflict((Examiner les conflits))
        Conversations((Gérer les conversations))
        Answer((Répondre aux questions sûres))
        Escalate((Escalader au personnel))
        Ticket((Gérer les tickets))
        Contractor((Assigner un prestataire))
        Dashboard((Superviser les opérations))
    end

    Manager --> Login
    Manager --> Property
    Manager --> Team
    Manager --> Calendar
    Manager --> Conflict
    Manager --> Conversations
    Manager --> Ticket
    Manager --> Contractor
    Manager --> Dashboard

    Staff --> Login
    Staff --> Calendar
    Staff --> Conflict
    Staff --> Conversations
    Staff --> Ticket
    Staff --> Contractor
    Staff --> Dashboard

    Channel --> Sync
    Guest --> Conversations
    Chatbot --> Answer
    Chatbot --> Escalate
    Answer --> Conversations
    Escalate --> Conversations
```

Le prestataire externe est intentionnellement omis en tant qu'acteur du système, dans la mesure où les prestataires ne disposent d'aucun compte d'authentification sur la plateforme au sein du périmètre du MVP.

## Diagramme de Classes Métier

Le diagramme de classes suivant expose la structure du domaine métier et les associations cardinales liant les entités fondamentales.

```mermaid
classDiagram
    class Company {
        +id
        +name
        +status
        +timezone
    }
    class AppUser {
        +id
        +email
        +passwordHash
        +role
        +status
    }
    class Property {
        +id
        +name
        +address
        +status
        +knowledge
    }
    class Channel {
        +id
        +type
        +calendarUrl
        +syncStatus
    }
    class Booking {
        +id
        +source
        +checkIn
        +checkOut
        +status
        +recordType
    }
    class Conversation {
        +id
        +guestContact
        +status
        +handlingMode
    }
    class Message {
        +id
        +senderType
        +language
        +content
        +deliveryStatus
    }
    class Ticket {
        +id
        +title
        +priority
        +status
    }
    class Contractor {
        +id
        +name
        +phone
        +specialty
    }
    class TicketAssignment {
        +id
        +assignedAt
        +endedAt
    }

    Company "1" --> "many" AppUser
    Company "1" --> "many" Property
    Company "1" --> "many" Contractor
    Property "1" --> "many" Channel
    Property "1" --> "many" Booking
    Channel "0..1" --> "many" Booking
    Property "1" --> "many" Conversation
    Booking "0..1" --> "many" Conversation
    Conversation "1" --> "many" Message
    Property "1" --> "many" Ticket
    Booking "0..1" --> "many" Ticket
    Ticket "1" --> "many" TicketAssignment
    Contractor "1" --> "many" TicketAssignment
```

## Séquence de Synchronisation des Calendriers

Ce diagramme illustre le flux asynchrone d'acquisition d'un flux iCalendar, l'analyse syntaxique des données au standard RFC 5545, l'insertion idempotente en base de données et l'évaluation proactive des conflits de réservation.

```mermaid
sequenceDiagram
    participant Scheduler as Planificateur
    participant Worker as Worker Celery
    participant Feed as Flux iCalendar
    participant Calendar as Module Calendrier
    participant DB as PostgreSQL
    participant Conflict as Service des Conflits

    Scheduler->>Worker: Démarrer rafraîchissement(channelId)
    Worker->>DB: Créer exécution de synchronisation
    Worker->>Feed: Télécharger le calendrier
    Feed-->>Worker: Contenu RFC 5545
    Worker->>Calendar: Analyser et normaliser les événements
    Calendar->>DB: Mettre à jour les réservations de façon idempotente
    Calendar->>Conflict: Évaluer les périodes modifiées
    Conflict->>DB: Créer/mettre à jour les enregistrements de conflit
    Worker->>DB: Clôturer l'exécution de synchronisation
```

## Séquence du Message Voyageur et du Chatbot

Ce diagramme présente le cycle complet de traitement d'un message entrant, depuis la réception du webhook WhatsApp et le dédoublonnage, jusqu'au filtrage de sûreté, l'ancrage factuel des réponses et le mécanisme d'escalade immédiate auprès du personnel.

```mermaid
sequenceDiagram
    participant Guest as Voyageur
    participant WA as Fournisseur WhatsApp
    participant API as API
    participant DB as PostgreSQL
    participant Policy as Politique Chatbot
    participant Domain as Services Propriété/Disponibilité
    participant Model as Modèle d'IA
    participant Staff as Personnel

    Guest->>WA: Envoyer message
    WA->>API: Événement webhook
    API->>DB: Dédoublonner et stocker le message
    API-->>WA: Accuser réception
    API->>Policy: Classifier le mode de traitement
    alt Demande sûre et prise en charge
        Policy->>Domain: Extraire les faits vérifiés
        Domain-->>Policy: Résultat autorisé
        Policy->>Model: Générer une réponse sous contraintes
        Model-->>Policy: Réponse candidate
        Policy->>WA: Envoyer la réponse approuvée
        Policy->>DB: Stocker le message du chatbot et la traçabilité
    else Données sensibles, incertaines ou indisponibles
        Policy->>DB: Marquer la conversation comme escaladée
        Policy-->>Staff: Créer une alerte d'attention
    end
```

## Diagramme d'Activité de la Maintenance

Ce diagramme d'activité modélise le cycle opérationnel de traitement des pannes, de la détection initiale (par signalement direct ou suggestion de l'IA) jusqu'à la confirmation humaine, la sélection du prestataire et la résolution consignée.

```mermaid
flowchart TD
    A["Incident signalé par le voyageur ou le personnel"] --> B{"Détecté par le chatbot ?"}
    B -- Oui --> C["Créer une suggestion de ticket"]
    C --> D{"Confirmation par le personnel ?"}
    D -- Non --> E["Rejeter ou demander des précisions"]
    D -- Oui --> F["Créer le ticket"]
    B -- Non --> F
    F --> G["Définir la priorité et le contexte de la propriété"]
    G --> H["Le personnel sélectionne le contact du prestataire"]
    H --> I["Enregistrer l'attribution"]
    I --> J["Le personnel contacte manuellement le prestataire"]
    J --> K["Passer le statut à En cours"]
    K --> L{"Résolu ?"}
    L -- Non --> K
    L -- Oui --> M["Clôturer et préserver l'historique"]
```

## Diagramme de Déploiement

Ce diagramme décrit la disposition physique et conteneurisée des composants logiciels au sein de l'environnement de déploiement.

```mermaid
flowchart TB
    Browser["Navigateur Utilisateur"] -->|HTTPS| Frontend["Conteneur Frontend / Hôte Statique"]
    Frontend -->|HTTPS JSON| Backend["Conteneur FastAPI"]
    WhatsApp["WhatsApp Cloud"] -->|Webhook HTTPS| Backend
    Backend --> Database[("PostgreSQL")]
    Backend --> Redis[("Redis")]
    Worker["Worker Celery"] --> Redis
    Worker --> Database
    Worker --> CalendarFeeds["Flux de Calendrier Externes"]
    Backend --> AIProvider["Fournisseur d'IA"]
    Worker --> AIProvider
```

## Règle de Maintenance des Diagrammes

Lorsqu'une exigence formellement approuvée modifie un acteur, une entité, un flux opérationnel, une dépendance inter-modules ou un composant d'infrastructure de déploiement, le ou les diagrammes associés doivent impérativement être mis à jour dans le cadre de la même *pull request*.
