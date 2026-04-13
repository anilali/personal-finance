# Equity Tracker — Engineering Spec (Phase 1: Option Grants)

## Scope

Phase 1 delivers the foundation: companies, ISO/NSO option grants, vesting schedules, and current valuations. No exercises or sales yet — those build on this in Phases 2-3.

---

## Database Schema

### New tables in `src/db/schema.ts`

#### `equity_companies`

```sql
id              uuid PK default random
name            text NOT NULL
ticker          text                     -- nullable for private cos
current_price   numeric(12,4)            -- manually updated share price
price_as_of     date                     -- when price was last set
is_current      boolean DEFAULT true     -- current vs former employer
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

#### `equity_grants`

```sql
id                uuid PK default random
company_id        uuid FK → equity_companies (cascade delete)
grant_type        enum('iso','nso')
grant_date        date NOT NULL
total_shares      numeric(12,4) NOT NULL
strike_price      numeric(12,4) NOT NULL
grant_price       numeric(12,4)          -- FMV at grant (= strike for ISOs)
expiration_date   date                   -- typically grant_date + 10 years
vesting_start     date NOT NULL
vesting_schedule  jsonb NOT NULL         -- see Vesting Schedule section
status            enum('active','fully_vested','expired','cancelled')
notes             text
created_at        timestamptz DEFAULT now()
```

#### `equity_vest_events`

Auto-generated from vesting schedule. One row per vest date.

```sql
id              uuid PK default random
grant_id        uuid FK → equity_grants (cascade delete)
vest_date       date NOT NULL
shares          numeric(12,4) NOT NULL
status          enum('scheduled','vested')
created_at      timestamptz DEFAULT now()
```

### Enums

```typescript
grantTypeEnum:  'iso' | 'nso'
grantStatusEnum: 'active' | 'fully_vested' | 'expired' | 'cancelled'
vestStatusEnum:  'scheduled' | 'vested'
```

### Questions

- **Auto-update vest event status:** Yes. Provide a server function (`vestAllPast`) the user can trigger from the UI (e.g., a "Sync Vests" button) that marks all vest events with `vestDate <= today` as vested. Also update grant status in the same pass. No cron — user-initiated.

- **Grant status transitions:** Same approach — computed during the sync pass, not on read. The sync function updates both vest event statuses and grant status (`fully_vested` if all vests done, `expired` if past expiration).

- **Soft delete grants:** Mark as cancelled (status enum). User keeps history.

---

## Vesting Schedule & Vest Event Generation

### Schema (JSONB on grant)

```typescript
type VestingSchedule =
  | {
      type: "standard";
      totalMonths: number;        // e.g. 48
      cliffMonths: number;        // e.g. 12
      frequency: "monthly" | "quarterly" | "annually";
    }
  | {
      type: "custom";
      events: { date: string; shares: number }[];
    };
```

### Generation algorithm (standard)

```
Input: vestingStart, totalShares, totalMonths, cliffMonths, frequency

1. cliffDate = vestingStart + cliffMonths
2. cliffShares = floor(totalShares × (cliffMonths / totalMonths))
3. Emit vest event: { date: cliffDate, shares: cliffShares }

4. remainingShares = totalShares - cliffShares
5. remainingMonths = totalMonths - cliffMonths
6. periodsAfterCliff = remainingMonths / frequencyMonths
7. sharesPerPeriod = floor(remainingShares / periodsAfterCliff)

8. For each period after cliff:
     date = cliffDate + (period × frequencyMonths)
     shares = sharesPerPeriod (last period gets remainder)
     Emit vest event

9. Insert all vest events into equity_vest_events
```

### Questions

- **Rounding:** Last vest gets the remainder. But vest events are pre-generated and **editable** — user can adjust individual vest amounts after generation if needed.

- **Re-generation:** Only regenerate `scheduled` events. Keep `vested` events untouched. Warn the user if changing a schedule with vested events.

- **Custom schedule validation:** Yes, validate that events sum to totalShares on save. Show a warning if they don't match.

---

## TypeScript Types

### New file: `src/lib/equity-tracker/types.ts`

```typescript
type GrantType = "iso" | "nso";
type GrantStatus = "active" | "fully_vested" | "expired" | "cancelled";
type VestStatus = "scheduled" | "vested";

interface Company {
  id: string;
  name: string;
  ticker: string | null;
  currentPrice: number | null;
  priceAsOf: string | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Grant {
  id: string;
  companyId: string;
  grantType: GrantType;
  grantDate: string;
  totalShares: number;
  strikePrice: number;
  grantPrice: number | null;
  expirationDate: string | null;
  vestingStart: string;
  vestingSchedule: VestingSchedule;
  status: GrantStatus;
  notes: string | null;
  createdAt: Date;
}

interface VestEvent {
  id: string;
  grantId: string;
  vestDate: string;
  shares: number;
  status: VestStatus;
}

interface GrantWithVesting extends Grant {
  vestEvents: VestEvent[];
  company: Company;
}

// Computed (not stored)
interface GrantSummary {
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  exercisableShares: number;  // = vestedShares (Phase 1, no exercises yet)
  currentSpread: number;      // max(0, currentPrice - strikePrice)
  exercisableValue: number;   // exercisableShares × currentSpread
  totalValue: number;         // totalShares × currentSpread (if fully vested)
  isExpired: boolean;
  isFullyVested: boolean;
}
```

### Questions

- **Price precision:** `numeric(12,4)` gives 4 decimal places. Enough for share prices? Some stocks trade in fractions of a cent.
  - Recommendation: 4 decimals is fine for display. We're estimating, not trading.

- **Shares precision:** Some grants have fractional shares (especially after cliff rounding). 4 decimals enough?
  - Recommendation: Yes. Most grants are whole shares. 4 decimals covers edge cases.

---

## Server Functions

### New file: `src/lib/equity-tracker/server-fns.ts`

| Function | Method | Input | Returns |
|----------|--------|-------|---------|
| `getCompanies` | GET | — | `Company[]` |
| `getCompany` | GET | `{ companyId }` | `Company` with grants |
| `createCompany` | POST | `{ name, ticker?, currentPrice?, isCurrent }` | `Company` |
| `updateCompany` | POST | `{ id, ...fields }` | `Company` |
| `deleteCompany` | POST | `{ id }` | `{ success }` |
| `getGrant` | GET | `{ grantId }` | `GrantWithVesting` |
| `createGrant` | POST | `{ companyId, grantType, grantDate, totalShares, strikePrice, grantPrice?, expirationDate?, vestingStart, vestingSchedule }` | `Grant` + generates vest events |
| `updateGrant` | POST | `{ id, ...fields }` | `Grant` + optionally regenerates vest events |
| `deleteGrant` | POST | `{ id }` | `{ success }` |
| `updateVestStatus` | POST | `{ vestEventId, status }` | `VestEvent` |

### Questions

- **Bulk vest update:** Yes. `vestAllPast` server function marks all vest events with `vestDate <= today` as vested and updates grant statuses. Triggered by a "Sync Vests" button in the UI.

- **Company deletion cascade:** Yes, cascade. UI handles confirmation before calling server.

---

## Route Structure

### URL design

```
/equity-tracker                          → Dashboard (sidebar + content)
/equity-tracker?company={id}             → Company selected, shows grants
/equity-tracker?company={id}&grant={id}  → Grant detail with vesting
```

Using search params (not nested routes) keeps it as a single route file with the sidebar always visible. The content area changes based on which params are set.

### Route file: `src/routes/equity-tracker.tsx`

```typescript
validateSearch: (search) => ({
  company: search.company as string | undefined,
  grant: search.grant as string | undefined,
})

loader: async ({ deps }) => {
  const companies = await getCompanies();
  const selectedCompany = deps.company ? await getCompany(...) : null;
  const selectedGrant = deps.grant ? await getGrant(...) : null;
  return { companies, selectedCompany, selectedGrant };
}
```

### Questions

- **Mobile:** Not supported. Desktop-only for now.

- **Deep linking:** If someone navigates to `?grant={id}` without `?company={id}`, show 404. Don't auto-resolve.

---

## Component Structure

```
src/components/equity-tracker/
  equity-layout.tsx          -- Sidebar + content shell
  company-sidebar.tsx        -- Company list in sidebar
  company-form.tsx           -- Add/edit company dialog
  grants-list.tsx            -- Grants table for selected company
  grant-detail.tsx           -- Full grant view with vesting
  grant-form.tsx             -- Add/edit grant (multi-step or single form?)
  vesting-table.tsx          -- Vest events table with status
  grant-summary-card.tsx     -- Computed values display
```

### Questions

- **Grant form:** Two sections in one form. Top: grant details. Bottom: vesting schedule. Not a full wizard.

- **Company price editing:** Requires opening a form (not inline). Edit button on the company page opens the company form.

---

## Computed Values (not stored)

These are calculated on the client from the grant + vest events + company price:

```typescript
function computeGrantSummary(grant: GrantWithVesting): GrantSummary {
  const vestedShares = grant.vestEvents
    .filter(v => v.status === "vested")
    .reduce((sum, v) => sum + v.shares, 0);

  const currentPrice = grant.company.currentPrice ?? 0;
  const spread = Math.max(0, currentPrice - grant.strikePrice);
  const isExpired = grant.expirationDate
    ? new Date(grant.expirationDate) < new Date()
    : false;

  return {
    totalShares: grant.totalShares,
    vestedShares,
    unvestedShares: grant.totalShares - vestedShares,
    exercisableShares: isExpired ? 0 : vestedShares,  // Phase 1: no exercises yet
    currentSpread: spread,
    exercisableValue: (isExpired ? 0 : vestedShares) * spread,
    totalValue: grant.totalShares * spread,
    isExpired,
    isFullyVested: vestedShares >= grant.totalShares,
  };
}
```

### Questions

- **Underwater options:** When strike > currentPrice, spread is 0 and value is $0. Should we show this prominently? "These options are currently underwater."
  - Recommendation: Yes. Show the spread as negative in a muted/warning style. Don't hide the information.

- **Expiration warning:** Should we warn when options are approaching expiration (e.g., within 90 days)?
  - Recommendation: Yes. Show a warning badge on grants expiring within 90 days.

---

## Open Questions Summary

| # | Question | Decision |
|---|----------|----------|
| 1 | Auto-mark vests as vested when date passes? | Yes — user-triggered "Sync Vests" button, no cron |
| 2 | Grant status transitions? | Updated during same sync pass |
| 3 | Soft delete grants or hard delete? | Soft delete — mark as cancelled |
| 4 | Rounding: last vest gets remainder? | Yes, but vest events are editable after generation |
| 5 | Re-edit schedule: regenerate only scheduled events? | Yes, keep vested events |
| 6 | Custom schedule must sum to totalShares? | Yes, validate on save |
| 7 | Price precision: numeric(12,4)? | Yes |
| 8 | Share precision: 4 decimal places? | Yes |
| 9 | Bulk "vest all past" operation? | Yes |
| 10 | Company delete cascade? | Yes, UI confirms |
| 11 | Mobile support? | No — desktop only |
| 12 | Deep link without company ID? | 404 |
| 13 | Grant form: single form or multi-step? | Single form, two sections |
| 14 | Company price editing? | Requires opening form (not inline) |
| 15 | Show underwater options prominently? | Yes, with warning style |
| 16 | Expiration warning within 90 days? | Yes |

---

## Dependencies

- No new npm packages needed — reuses existing shadcn/ui components, react-hook-form, zod
- New DB tables require `pnpm db:push`
- Existing `src/db/index.ts` database connection reused

## Estimated File Count

- 1 DB schema update
- 1 types file
- 1 server functions file
- 1 route file
- ~8 component files
- 1 utility file (computeGrantSummary)
