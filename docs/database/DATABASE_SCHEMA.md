# COIN-IDEAL — Database Schema (ERD)

Two diagrams: (1) what exists today in `supabase/migrations/00001`–`00026`, and
(2) the additive target after the new tables proposed in
`DATABASE_IMPLEMENTATION_PLAN.md` / `supabase/migrations/00027`–`00029`. Nothing in
diagram 2 has been applied — see that plan for phasing.

## 1. Existing schema (as implemented)

```mermaid
erDiagram
    PROFILES ||--o| PROVIDER_PROFILES : "has (optional)"
    PROFILES ||--o{ ADDRESSES : owns
    PROFILES ||--o{ SERVICE_REQUESTS : "as client"
    PROFILES ||--o{ BOOKINGS : "as client"
    PROFILES ||--o{ FAVORITES : owns
    PROFILES ||--o{ REVIEWS : writes
    PROFILES ||--o{ NOTIFICATIONS : receives
    PROFILES ||--o{ MESSAGES : sends
    PROFILES ||--o{ MESSAGE_THREADS : "participant 1/2"
    PROFILES ||--o{ REPORTS : files
    PROFILES ||--o{ ADMIN_LOGS : "acts as admin"

    PROVIDER_PROFILES ||--o{ SERVICES : offers
    PROVIDER_PROFILES ||--o{ SERVICE_REQUESTS : receives
    PROVIDER_PROFILES ||--o{ BOOKINGS : fulfills
    PROVIDER_PROFILES ||--o{ REVIEWS : "rated on"

    CATEGORIES ||--o{ SERVICES : classifies

    SERVICES ||--o{ SERVICE_IMAGES : has
    SERVICES ||--o{ SERVICE_AVAILABILITY : has
    SERVICES ||--o{ SERVICE_REQUESTS : "requested for"
    SERVICES ||--o{ BOOKINGS : "booked for"
    SERVICES ||--o{ FAVORITES : "favorited as"
    SERVICES ||--o{ REVIEWS : "reviewed for (optional)"

    SERVICE_REQUESTS ||--o| BOOKINGS : "confirms into"
    BOOKINGS ||--o{ REVIEWS : "reviewed after (optional)"

    MESSAGE_THREADS ||--o{ MESSAGES : contains

    PROFILES {
        uuid id PK "= auth.users.id"
        text email
        text role "client|provider|admin"
    }
    PROVIDER_PROFILES {
        uuid id PK
        uuid user_id FK "UNIQUE -> profiles"
        text business_name
        numeric rating
    }
    CATEGORIES {
        uuid id PK
        text slug UK
        boolean is_active
    }
    SERVICES {
        uuid id PK
        uuid provider_id FK
        uuid category_id FK
        numeric price
        boolean is_active
    }
    SERVICE_REQUESTS {
        uuid id PK
        uuid client_id FK
        uuid service_id FK
        uuid provider_id FK
        text message "JSON-encoded for document orders (gap)"
        text status "pending|accepted|rejected|completed|cancelled"
    }
    BOOKINGS {
        uuid id PK
        uuid request_id FK
        text status "pending|confirmed|in_progress|completed|cancelled"
        numeric total_price
    }
    ADDRESSES {
        uuid id PK
        uuid user_id FK
        text country "default Haiti"
    }
    REVIEWS {
        uuid id PK
        uuid reviewer_id FK
        uuid provider_id FK
        uuid service_id FK "nullable"
        uuid booking_id FK "nullable"
        int rating "1-5"
    }
```

**No `payments`, `orders`, `order_items`, `deliveries`, `settings` tables exist in this
diagram** — that's the gap documented in `DATABASE_ARCHITECTURE.md` §3.

## 2. Target schema (existing + proposed additions)

Additions only — existing tables/relations from diagram 1 are unchanged and omitted here
for readability except where a new table references them.

```mermaid
erDiagram
    PROFILES ||--o{ ORDERS : places
    SERVICES ||--o{ ORDERS : "ordered as"
    ADDRESSES ||--o{ ORDERS : "delivered to (optional)"

    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ PAYMENTS : "paid via"
    ORDERS ||--o{ ORDER_STATUS_HISTORY : logs
    ORDER_ITEMS ||--o{ ORDER_ITEM_FINISHINGS : "adds"
    FINISHING_OPTIONS ||--o{ ORDER_ITEM_FINISHINGS : "chosen as"
    DELIVERY_ZONES ||--o{ ORDERS : "prices delivery for"
    PROFILES ||--o{ ORDER_STATUS_HISTORY : "changed by (optional)"
    PROFILES ||--o{ PAYMENTS : "recorded by (optional)"

    ORDERS {
        uuid id PK
        uuid client_id FK
        uuid service_id FK "RESTRICT delete"
        text status "en_attente|confirmee|en_preparation|prete|en_livraison|livree|retiree|annulee"
        text reception_method "pickup|delivery"
        uuid delivery_address_id FK "nullable"
        uuid delivery_zone_id FK "nullable"
        numeric delivery_fee
        numeric subtotal
        numeric total
        timestamptz ready_at
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        text file_path "order-documents bucket path, nullable"
        text file_name
        int pages
        int copies
        text color "bw|color"
        text sided "simplex|duplex"
        numeric unit_price "snapshot of services.price at order time"
        numeric line_total
    }
    FINISHING_OPTIONS {
        text id PK "binding|lamination|stapling"
        text label
        numeric cost
        boolean is_active
    }
    ORDER_ITEM_FINISHINGS {
        uuid order_item_id FK
        text finishing_id FK
        numeric cost "snapshot"
    }
    PAYMENTS {
        uuid id PK
        uuid order_id FK
        numeric amount
        text method "cash|moncash|natcash|transfer"
        text reference "nullable"
        text status "pending|confirmed|failed|refunded"
        uuid recorded_by FK "nullable, staff who logged it"
        timestamptz paid_at
    }
    ORDER_STATUS_HISTORY {
        uuid id PK
        uuid order_id FK
        text status
        text note
        uuid changed_by FK "nullable"
        timestamptz created_at
    }
    DELIVERY_ZONES {
        uuid id PK
        text name
        numeric fee
        boolean is_active
    }
    SETTINGS {
        text key PK
        jsonb value
        text description
    }
```

### Design notes

- **`order_items.unit_price` and `order_item_finishings.cost` are snapshots**, copied from
  `services.price` / `finishing_options.cost` at order-creation time — so a later tariff
  change never rewrites the price of an already-placed order. This is standard
  order-line-item practice and is what makes server-side recomputation meaningful (compare
  the *snapshot* stored server-side against what the client displayed, not against the
  live, possibly-since-changed tariff).
- **`orders.service_id` uses `ON DELETE RESTRICT`**, not `CASCADE` like most of this
  schema's FKs — you cannot delete a `services` row that has orders against it (unlike
  `service_requests`, which cascades). Financial/order history must not silently
  disappear when a service is deleted; deactivate (`is_active = false`) instead.
- **`settings` is a generic key/value table**, not one column per setting, because the
  cahier des charges explicitly asks for tariffs and delivery config to change "sans
  changement de code" — a typed table would need a migration for every new setting,
  defeating the point. `jsonb value` keeps it queryable while staying schema-flexible.
- **`orders` does not replace `service_requests`/`bookings`.** It is scoped to the
  impression/copie/vente-d'eau transactional flow described in cahier des charges §3–§5,
  using that document's own status vocabulary. Existing marketplace tables are unchanged.
