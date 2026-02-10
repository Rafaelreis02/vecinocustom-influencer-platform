# Status System Migration - 3 Phases

## Overview

The influencer status system has been refactored from a flat structure to a 3-phase workflow:

### Phase 1: Prospeção (Prospecting) 🔍
- **UNKNOWN** - Desconhecido: No social media associated
- **SUGGESTION** - Sugestão: AI suggested via scraping
- **IMPORT_PENDING** - A Importar: Being analyzed by agent

### Phase 2: A Negociar (Negotiating) 💬
- **ANALYZING** - Em Análise: Analyzing influencer's proposal
- **COUNTER_PROPOSAL** - Contraproposta: Influencer analyzing our counter-proposal

### Phase 3: Em Curso (Closing) ✅
- **AGREED** - Acordado: Values agreed, pending product selection + address
- **PRODUCT_SELECTION** - Seleção Produto: Product chosen, awaiting design confirmation
- **CONTRACT_PENDING** - Contrato Pendente: Design chosen, pending contract signature
- **SHIPPED** - Enviado: Order shipped, awaiting content delivery
- **COMPLETED** - Concluído: Content delivered and approved

### Special Statuses
- **CANCELLED** - Cancelado: Deal cancelled
- **BLACKLISTED** - Bloqueado: Influencer blocked

## Migration

The database migration automatically converts old status values to new ones:

```
OLD STATUS           → NEW STATUS
─────────────────────────────────────
suggestion           → SUGGESTION
negotiating          → ANALYZING
working              → AGREED
NEW                  → UNKNOWN
NEGOTIATING          → ANALYZING
AWAITING_PRODUCT     → PRODUCT_SELECTION
PRODUCT_SENT         → SHIPPED
COMPLETED            → COMPLETED
CANCELLED            → CANCELLED
ACTIVE               → AGREED
INACTIVE             → CANCELLED
PENDING              → UNKNOWN
IMPORT_PENDING       → IMPORT_PENDING
BLACKLISTED          → BLACKLISTED
```

## Running the Migration

1. Ensure you have a backup of your database
2. Run the migration:
   ```bash
   npm run db:migrate
   ```

## New Pages

The influencer management UI is now split into 3 phase-specific pages:

- `/dashboard/influencers/prospecting` - Phase 1: Prospeção
- `/dashboard/influencers/negotiating` - Phase 2: A Negociar
- `/dashboard/influencers/closing` - Phase 3: Em Curso

Each page has tabs for the individual statuses within that phase.

The old `/dashboard/influencers` page now redirects to `/dashboard/influencers/prospecting`.

## Sidebar Navigation

The Influencers menu in the sidebar is now collapsible with 3 sub-items for each phase.
It auto-expands when you're on any influencers route.

## Components Updated

- `StatusBadge` - Now shows new status labels and colors
- `StatusDropdown` - Now grouped by phase with visual separators
- `PhasePageLayout` - Shared component for all 3 phase pages
- `Sidebar` - Now has collapsible menu structure

## API Changes

### BigInt Serialization Fixed

Both GET endpoints now properly serialize BigInt values to strings:
- `GET /api/influencers`
- `GET /api/influencers/[id]`

### Status Values

All API endpoints now use the new uppercase status values (e.g., `SUGGESTION`, `ANALYZING`, `AGREED`).

The PATCH endpoint used by workers still accepts the generic `data: body` format, so it's fully compatible.

## Notes

- Old status values in query strings (e.g., `?status=working`) will no longer match influencers after migration
- Components that hardcode old status values have been updated
- The default status for new influencers is now `UNKNOWN`
