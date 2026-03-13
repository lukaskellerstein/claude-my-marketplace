---
name: mermaid-diagrams
description: Mermaid diagram creation for software documentation. Use when generating architecture diagrams, sequence diagrams, flowcharts, entity-relationship diagrams, class diagrams, state diagrams, C4 models, or any visual representation in markdown documentation. Always use the mermaid MCP server for rendering and validation. Covers diagram syntax, best practices, and common patterns for documenting software systems.
---

# Mermaid Diagrams for Documentation

Always use the **mermaid MCP server** (`mcp__mermaid__*`) for creating and validating diagrams. Embed diagrams directly in markdown documentation using fenced code blocks.

## When to Use Which Diagram Type

| Diagram Type | Use For |
|---|---|
| **Flowchart** | Decision logic, process flows, algorithms |
| **Sequence** | API calls, service interactions, request/response flows |
| **C4 Context** | System boundaries, external actors, high-level architecture |
| **C4 Container** | Services, databases, message queues within a system |
| **C4 Component** | Internal structure of a single service |
| **Entity-Relationship** | Database schemas, data models |
| **Class** | Object models, type hierarchies, domain models |
| **State** | Lifecycle states, status transitions, workflows |
| **Gantt** | Timelines, project phases, migration plans |
| **Architecture** (beta) | Cloud infrastructure, deployment topology |

## Diagram Patterns

### System Overview (C4 Context)

Use for `docs/architecture/system-overview.md`:

```mermaid
C4Context
    title System Context Diagram

    Person(user, "User", "Application end user")
    Person(admin, "Admin", "System administrator")

    System(app, "Application", "Core application system")

    System_Ext(auth, "Identity Provider", "Keycloak SSO")
    System_Ext(payment, "Payment Gateway", "Stripe")
    System_Ext(email, "Email Service", "SendGrid")

    Rel(user, app, "Uses", "HTTPS")
    Rel(admin, app, "Manages", "HTTPS")
    Rel(app, auth, "Authenticates via", "OIDC")
    Rel(app, payment, "Processes payments", "API")
    Rel(app, email, "Sends notifications", "API")
```

### Service Architecture (C4 Container)

Use for detailed architecture docs:

```mermaid
C4Container
    title Container Diagram

    Person(user, "User")

    Container_Boundary(system, "Application") {
        Container(web, "Web App", "React", "User interface")
        Container(api, "API Server", "Go", "Business logic and REST API")
        Container(worker, "Worker", "Python", "Background job processing")
        Container(db, "Database", "PostgreSQL", "Persistent storage")
        Container(cache, "Cache", "Redis", "Session and data cache")
        Container(queue, "Message Queue", "RabbitMQ", "Async job queue")
    }

    Rel(user, web, "Uses", "HTTPS")
    Rel(web, api, "Calls", "REST/JSON")
    Rel(api, db, "Reads/Writes", "SQL")
    Rel(api, cache, "Caches", "Redis protocol")
    Rel(api, queue, "Publishes jobs", "AMQP")
    Rel(worker, queue, "Consumes jobs", "AMQP")
    Rel(worker, db, "Reads/Writes", "SQL")
```

### API Request Flow (Sequence)

Use for `docs/features/<feature>/design.md`:

```mermaid
sequenceDiagram
    actor User
    participant GW as API Gateway
    participant Auth as Auth Service
    participant API as Backend API
    participant DB as Database
    participant Cache as Redis

    User->>GW: POST /api/v1/orders
    GW->>Auth: Validate token
    Auth-->>GW: Token valid (user: alice)

    GW->>API: Forward request + user context
    API->>Cache: Check rate limit
    Cache-->>API: OK (42/100 requests)

    API->>DB: INSERT order
    DB-->>API: Order created (id: 789)

    API-->>GW: 201 Created {orderId: 789}
    GW-->>User: 201 Created
```

### Data Flow

Use for `docs/architecture/data-flow.md`:

```mermaid
flowchart LR
    subgraph Ingestion
        A[API] --> B[Validation]
        B --> C[Transform]
    end

    subgraph Processing
        C --> D[Message Queue]
        D --> E[Worker Pool]
        E --> F[Business Logic]
    end

    subgraph Storage
        F --> G[(Primary DB)]
        F --> H[(Search Index)]
        F --> I[Object Storage]
    end

    subgraph Output
        G --> J[API Responses]
        H --> K[Search Results]
        I --> L[File Downloads]
    end
```

### Database Schema (ER Diagram)

Use for data model documentation:

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        uuid id PK
        uuid user_id FK
        string status
        decimal total
        timestamp created_at
    }

    ORDER_ITEM }o--|| PRODUCT : references
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal price
    }

    PRODUCT {
        uuid id PK
        string name
        decimal price
        string category
    }
```

### State Machine

Use for workflow/lifecycle documentation:

```mermaid
stateDiagram-v2
    [*] --> Draft

    Draft --> Pending: Submit
    Draft --> Cancelled: Cancel

    Pending --> Approved: Approve
    Pending --> Rejected: Reject
    Pending --> Draft: Request Changes

    Approved --> InProgress: Start Work
    Rejected --> Draft: Revise

    InProgress --> Review: Complete
    Review --> Done: Accept
    Review --> InProgress: Request Fixes

    Done --> [*]
    Cancelled --> [*]
```

### Deployment Architecture

Use for `docs/architecture/infrastructure.md`:

```mermaid
flowchart TB
    subgraph Internet
        U[Users]
        CDN[CDN / CloudFlare]
    end

    subgraph GCP["Google Cloud Platform"]
        subgraph LB["Load Balancing"]
            GLB[Global LB]
        end

        subgraph GKE["GKE Cluster"]
            subgraph Ingress
                TR[Traefik]
            end

            subgraph Services
                API[API Pods]
                WEB[Web Pods]
                WRK[Worker Pods]
            end

            subgraph Auth
                KC[Keycloak]
                OA[OAuth2-proxy]
            end
        end

        subgraph Data
            SQL[(Cloud SQL)]
            GCS[Cloud Storage]
            MEM[(Memorystore)]
        end
    end

    U --> CDN --> GLB --> TR
    TR --> OA --> API
    TR --> WEB
    OA --> KC
    API --> SQL
    API --> MEM
    WRK --> SQL
    WRK --> GCS
```

### Class / Domain Model

Use for domain-driven design documentation:

```mermaid
classDiagram
    class Order {
        +UUID id
        +OrderStatus status
        +Money total
        +place()
        +cancel()
        +complete()
    }

    class OrderItem {
        +UUID productId
        +int quantity
        +Money price
        +Money subtotal()
    }

    class Money {
        +Decimal amount
        +Currency currency
        +add(Money) Money
        +multiply(int) Money
    }

    class OrderStatus {
        <<enumeration>>
        DRAFT
        PENDING
        APPROVED
        COMPLETED
        CANCELLED
    }

    Order "1" *-- "1..*" OrderItem
    Order --> OrderStatus
    OrderItem --> Money
    Order --> Money
```

## Best Practices

1. **One diagram per concept** — don't overload a single diagram; split complex systems into multiple views
2. **Use consistent naming** — same service/component names across all diagrams
3. **Label relationships** — always annotate arrows with protocol, action, or data type
4. **Keep it readable** — limit to ~10-15 nodes per diagram; use subgraphs for grouping
5. **Use the MCP server** — validate diagram syntax before committing by using `mcp__mermaid__*` tools
6. **Match the audience** — C4 Context for stakeholders, Sequence for developers, ER for database teams
7. **Update diagrams with code** — when architecture changes, update the diagram in the same PR
