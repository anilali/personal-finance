# Equity Tracker — Implementation Overview

## What's Built

A full equity compensation tracker covering the lifecycle of stock options (ISO/NSO): company management, option grants, vesting schedules, exercise logging, share sales with tax-lot tracking, and 83(b) election support.

---

## Data Model

### Tables

| Table | Purpose |
|---|---|
| `equity_companies` | Companies with share price, separation date for former employers |
| `equity_grants` | ISO/NSO option grants with grant ID, strike, expiration |
| `equity_vest_events` | Individual vest events (scheduled, vested, forfeited) |
| `equity_exercises` | Exercise records with FMV, early exercise, 83(b) tracking |
| `equity_sales` | Share sales tied to exercise lots for cost basis |

### Key Relationships

```
Company → Grants → Vest Events
                 → Exercises → Sales (via exerciseId FK)
```

---

## Features

### Companies
- Add/edit companies with name, ticker, current share price, price-as-of date
- Mark as current or former employer
- Former employers have a **separation date** (last day) — used to forfeit unvested shares
- Sidebar navigation with company selection
- Cascade delete (removes all grants, exercises, sales)

### Grants
- ISO and NSO grant types with distinct color badges (blue/amber)
- User-facing Grant ID (e.g., "G-001234") displayed prominently
- Grant details: date, total shares, strike price, FMV at grant, expiration date
- Soft delete (marks as cancelled, preserves history)

### Vesting Schedule
- **Two generation methods:**
  - **Standard** — cliff + periodic vesting with configurable total months, cliff months, frequency (monthly/quarterly/annually), and remainder strategy (first/last vest)
  - **Date range** — first vest date, last vest date, shares per vest, frequency
- Preview before applying with share total validation
- Manual event creation (inline add row)
- Inline editing — click date or shares to edit directly
- Delete individual vest events
- **Sync Vests** button: marks past-due events as vested, forfeits post-separation events, updates grant status
- Mismatch warning when scheduled shares don't equal grant total

### Vest Event Statuses
| Status | Meaning |
|---|---|
| `scheduled` | Future vest, not yet due |
| `vested` | Shares have vested |
| `forfeited` | Post-separation date, marked by sync |

### Exercises
- Log exercises against a grant with date, shares, FMV at exercise
- Exercise price auto-set to strike (not user-editable)
- Reference ID for tracking
- **Early exercise support:**
  - Track unvested shares included in exercise
  - 83(b) election filed toggle + date
  - 30-day filing deadline warning
- Edit and delete exercises
- Exercise table shows: ref, date, shares, type (Standard / 83(b) / No 83(b)), FMV, spread, cost
- Tax hints: ISO (AMT preference) vs NSO (ordinary income)

### Sales (Lot Tracking)
- **Sales tied to exercise lots** via `exerciseId` FK
- Lot picker dropdown showing: exercise date, shares available, cost basis
- **Cost basis auto-derived from grant type:**
  - NSO: FMV at exercise (spread already taxed as income)
  - ISO: Strike price (no income at exercise)
- **Holding period auto-calculated:** exercise date to sale date (short-term ≤ 1 year, long-term > 1 year)
- **ISO qualifying disposition detection:** checks both 2-year grant hold and 1-year exercise hold
- Live preview: proceeds, cost basis, capital gain/loss
- Sale table shows: ref, lot, date, shares, price, proceeds, gain/loss, term badge (green/orange)
- Edit and delete sales
- Totals: total proceeds, total gain/loss, tax treatment hint

### Grant Summary Card
- **4 primary boxes:** Total Units, Vested (+ unvested count), Exercised (+ exercisable count), Sold (+ held count)
- Contextual badges: "Fully vested", "Fully exercised", "All sold"
- Forfeited box with muted amber styling (when applicable)
- Potential value of remaining options
- Warnings: expired, underwater, expiring within 90 days

### Navigation & UX
- Sidebar + content layout
- URL-driven: `?company={id}&grant={id}&tab={vesting|exercises|sales}`
- Tabs persist in URL (reload-safe)
- Three tabs on grant detail: Vesting, Exercises, Sales
- Line-style tabs with primary color active state
- After creating a grant, navigates directly to grant detail
- Company form pre-populates on edit
- Grant delete on list page (hover), edit on detail page

---

## File Structure

```
src/
├── db/schema.ts                              # All equity tables + enums
├── lib/equity-tracker/
│   ├── types.ts                              # TypeScript interfaces
│   ├── schemas.ts                            # Zod validation schemas
│   ├── server-fns.ts                         # All CRUD + bulk sync
│   └── utils.ts                              # Vest generation, summary computation, lot tracking, formatters
├── components/equity-tracker/
│   ├── equity-layout.tsx                     # Sidebar + content shell
│   ├── company-sidebar.tsx                   # Company list navigation
│   ├── company-form.tsx                      # Add/edit company dialog
│   ├── grants-list.tsx                       # Grants table for selected company
│   ├── grant-detail.tsx                      # Full grant view with tabs
│   ├── grant-form.tsx                        # Add/edit grant dialog
│   ├── grant-summary-card.tsx                # Computed values display
│   ├── vesting-table.tsx                     # Vest events with inline edit
│   ├── schedule-generator.tsx                # Standard + date range generation
│   ├── exercise-form.tsx                     # Log/edit exercise with 83(b)
│   ├── exercise-table.tsx                    # Exercise history
│   ├── sale-form.tsx                         # Log/edit sale with lot picker
│   └── sale-table.tsx                        # Sale history with gain/loss
└── routes/equity-tracker.tsx                 # Route with search params + loader
```

---

## Server Functions

| Function | Method | Purpose |
|---|---|---|
| `getCompanies` | GET | List all companies |
| `getCompany` | GET | Company with grants |
| `createCompany` | POST | Add company |
| `updateCompany` | POST | Edit company |
| `deleteCompany` | POST | Delete company (cascade) |
| `getGrant` | GET | Grant with vest events, exercises, sales |
| `createGrant` | POST | Add grant |
| `updateGrant` | POST | Edit grant |
| `deleteGrant` | POST | Soft delete (cancel) |
| `createVestEvent` | POST | Add single vest event |
| `bulkCreateVestEvents` | POST | Batch create from generator |
| `updateVestEvent` | POST | Edit vest event (date, shares, status) |
| `deleteVestEvent` | POST | Remove vest event |
| `vestAllPast` | POST | Sync: vest past events, forfeit post-separation, update grant status |
| `createExercise` | POST | Log exercise with optional 83(b) |
| `updateExercise` | POST | Edit exercise |
| `deleteExercise` | POST | Remove exercise |
| `createSale` | POST | Log sale tied to exercise lot |
| `updateSale` | POST | Edit sale |
| `deleteSale` | POST | Remove sale |

---

## Tax Logic

### Cost Basis at Sale
- **NSO:** FMV at exercise (spread taxed as ordinary income at exercise)
- **ISO:** Strike price (no income at exercise for regular tax)

### Holding Period
- Short-term: sold ≤ 1 year from exercise
- Long-term: sold > 1 year from exercise

### ISO Qualifying Disposition
- Must hold 2+ years from grant date AND 1+ year from exercise date
- Disqualifying: spread at exercise taxed as ordinary income
- Qualifying: entire gain taxed as long-term capital gains

### 83(b) Election
- Tracks filing status and date for early exercises (unvested shares)
- 30-day deadline warning from exercise date
- For options: primarily affects holding period start, not cost basis

---

## Not Yet Built
- RSU grant type (different lifecycle — no exercise, vesting = delivery)
