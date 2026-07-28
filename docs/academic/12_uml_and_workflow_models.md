# UML and Workflow Models

**Status:** Editable conception models; diagrams must evolve with approved requirements

## System Use-Case Diagram

```mermaid
flowchart LR
    Manager["Property Manager"]
    Staff["Staff Member"]
    Guest["Guest"]
    Channel["Booking Channel"]
    Chatbot["Chatbot"]

    subgraph Vayca
        Login((Authenticate))
        Property((Manage Properties))
        Team((Manage Team))
        Calendar((View Portfolio Calendar))
        Sync((Synchronize Calendars))
        Conflict((Review Conflicts))
        Conversations((Manage Conversations))
        Answer((Answer Safe Questions))
        Escalate((Escalate to Staff))
        Ticket((Manage Tickets))
        Contractor((Assign Contractor Contact))
        Dashboard((Review Operations))
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

The contractor is intentionally absent as a system actor because contractors do not authenticate in the MVP.

## Domain Class Diagram

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

## Calendar Synchronization Sequence

```mermaid
sequenceDiagram
    participant Scheduler
    participant Worker
    participant Feed as iCalendar Feed
    participant Calendar as Calendar Module
    participant DB as PostgreSQL
    participant Conflict as Conflict Service

    Scheduler->>Worker: Start refresh(channelId)
    Worker->>DB: Create sync run
    Worker->>Feed: Download calendar
    Feed-->>Worker: RFC 5545 content
    Worker->>Calendar: Parse and normalize events
    Calendar->>DB: Upsert bookings idempotently
    Calendar->>Conflict: Evaluate changed periods
    Conflict->>DB: Create/update conflict records
    Worker->>DB: Complete sync run
```

## Guest Message and Chatbot Sequence

```mermaid
sequenceDiagram
    participant Guest
    participant WA as WhatsApp Provider
    participant API
    participant DB
    participant Policy as Chatbot Policy
    participant Domain as Property/Availability Services
    participant Model as AI Model
    participant Staff

    Guest->>WA: Send message
    WA->>API: Webhook event
    API->>DB: Deduplicate and store message
    API-->>WA: Acknowledge
    API->>Policy: Classify handling path
    alt Safe supported request
        Policy->>Domain: Retrieve verified facts
        Domain-->>Policy: Authorized result
        Policy->>Model: Generate constrained reply
        Model-->>Policy: Candidate reply
        Policy->>WA: Send approved reply
        Policy->>DB: Store chatbot message and provenance
    else Sensitive, uncertain, or unavailable data
        Policy->>DB: Mark conversation escalated
        Policy-->>Staff: Create attention alert
    end
```

## Maintenance Activity Diagram

```mermaid
flowchart TD
    A["Issue reported by guest or staff"] --> B{"Chatbot detected it?"}
    B -- Yes --> C["Create ticket suggestion"]
    C --> D{"Staff confirms?"}
    D -- No --> E["Reject or request more information"]
    D -- Yes --> F["Create ticket"]
    B -- No --> F
    F --> G["Set priority and property context"]
    G --> H["Staff selects contractor contact"]
    H --> I["Record assignment"]
    I --> J["Staff contacts contractor manually"]
    J --> K["Update status to In Progress"]
    K --> L{"Resolved?"}
    L -- No --> K
    L -- Yes --> M["Resolve and preserve history"]
```

## Deployment Diagram

```mermaid
flowchart TB
    Browser["User Browser"] -->|HTTPS| Frontend["Frontend Container / Static Host"]
    Frontend -->|HTTPS JSON| Backend["FastAPI Container"]
    WhatsApp["WhatsApp Cloud"] -->|HTTPS Webhook| Backend
    Backend --> Database[("PostgreSQL")]
    Backend --> Redis[("Redis")]
    Worker["Celery Worker"] --> Redis
    Worker --> Database
    Worker --> CalendarFeeds["External Calendar Feeds"]
    Backend --> AIProvider["AI Provider"]
    Worker --> AIProvider
```

## Diagram Maintenance Rule

When an approved requirement changes an actor, entity, workflow, module dependency, or deployment component, the related diagram must be updated in the same pull request.
