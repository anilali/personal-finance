# Equity Tracker — Product Spec

## Overview

A personal equity tracking tool for managing stock options (ISOs and NSOs) across multiple employers. Tracks the full lifecycle: grant → vesting → exercise → sale, with tax impact at each step.

RSUs and ESPP support will be added in later phases.

## Goals

- Track option grants across current and former employers
- See vesting schedules and what's exercisable
- Record exercises with method (cash, sell-to-cover, same-day sale)
- Record share sales and compute gain/loss with correct cost basis
- Tie grants → exercises → sales together as a connected chain
- Estimate tax impact at each event

## Non-Goals (Phase 1)

- No RSU or ESPP tracking (later phases)
- No tax estimator integration (standalone)
- No real-time stock price feeds (manual price entry)
- No exercise strategy optimization / AMT modeling

---

## Implementation Phases

### Phase 1: Option Grants

Track the grant itself and its vesting schedule. The foundation everything else builds on.

**What the user can do:**
- Add companies (name, ticker, current share price)
- Add ISO/NSO grants linked to a company
- Define vesting schedule (standard cliff + monthly/quarterly, or custom dates)
- See auto-generated vest events from the schedule
- View which options are vested (exercisable) vs unvested
- See current spread value (current price - strike) × vested shares
- Update stock price to refresh valuations

**Data:**
- Companies table
- Grants table (type, grant date, total shares, strike price, vesting schedule)
- Vest events table (auto-generated from schedule, status: scheduled/vested)

**UI:**
- Dashboard: list of companies with grant summaries
- Company page: list of grants, current price, total value
- Grant page: vesting schedule table, share balance, current value

---

### Phase 2: Exercises

Record when the user exercises options. Links back to a grant.

**What the user can do:**
- Record an exercise against a grant
- Pick exercise method: cash, sell-to-cover, or same-day sale
- Enter: date, shares exercised, FMV at exercise
- System computes: total cost, spread, shares sold to cover, shares retained, tax estimate
- See exercise history on the grant page
- Grant's "exercisable" balance decreases by shares exercised
- For sell-to-cover: system calculates how many shares were sold

**Data:**
- Exercise events table (linked to grant)
- Fields: date, shares, FMV, method, shares sold, shares retained, tax withheld

**Tax display:**
- ISO cash/sell-to-cover: show AMT adjustment (spread × retained shares)
- ISO same-day: show ordinary income (spread × all shares) — disqualifying
- NSO any method: show ordinary income (spread × all shares)

**Computed fields on grant:**
- Total exercised, total unexercised (vested - exercised), shares held post-exercise

---

### Phase 3: Sales

Record when the user sells shares acquired from exercise. Links back to an exercise (and through it, to the grant).

**What the user can do:**
- Record a sale against an exercise event
- Enter: date, shares sold, sale price per share
- System computes: cost basis, gain/loss, holding period, qualifying vs disqualifying (ISO)
- Can do partial sales (sell 50 of 200 shares from one exercise)
- See sale history on the grant page
- Shares held balance decreases

**Data:**
- Stock sales table (linked to exercise event and grant)
- Fields: date, shares, sale price, cost basis (auto-computed), gain/loss, holding period

**Cost basis rules:**
- ISO qualifying: cost basis = strike price
- ISO disqualifying: cost basis = FMV at exercise (ordinary income portion already taxed)
- NSO: cost basis = FMV at exercise

**Holding period rules:**
- Long-term: held > 1 year from exercise date
- ISO qualifying disposition: held > 2 years from grant date AND > 1 year from exercise date

**Tax display per sale:**
- ISO qualifying: LTCG = (sale price - strike) × shares
- ISO disqualifying: ordinary income + STCG/LTCG breakdown
- NSO: STCG or LTCG = (sale price - FMV at exercise) × shares

---

## Data Model

### Company

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | e.g. "Acme Corp" |
| ticker | text | nullable — blank for private companies |
| currentPrice | numeric | latest share price (manually entered) |
| priceAsOf | date | when the price was last updated |
| isCurrent | boolean | current employer or former |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Grant

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| companyId | uuid | FK → companies |
| type | enum | `iso`, `nso` (phase 1); `rsu`, `espp` later |
| grantDate | date | date of grant |
| totalShares | numeric | total options in the grant |
| strikePrice | numeric | exercise price per share |
| grantPrice | numeric | FMV at grant date (= strike for ISOs) |
| expirationDate | date | typically 10 years from grant |
| vestingStartDate | date | when vesting clock starts |
| vestingSchedule | jsonb | see below |
| status | enum | `active`, `fully-vested`, `fully-exercised`, `expired`, `cancelled` |
| notes | text | optional |
| createdAt | timestamp | |

### Vest Event

Auto-generated from the vesting schedule. One row per vest date.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| grantId | uuid | FK → grants |
| vestDate | date | when these options become exercisable |
| shares | numeric | number of options vesting |
| status | enum | `scheduled`, `vested` |

### Exercise Event (Phase 2)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| grantId | uuid | FK → grants |
| exerciseDate | date | |
| sharesExercised | numeric | |
| strikePrice | numeric | price paid per share |
| fmvAtExercise | numeric | market price on exercise date |
| exerciseMethod | enum | `cash`, `sell-to-cover`, `same-day-sale` |
| sharesSoldToCover | numeric | shares sold (sell-to-cover/same-day) |
| sharesRetained | numeric | shares kept |
| totalCost | numeric | strike × shares |
| taxWithheld | numeric | |
| notes | text | |
| createdAt | timestamp | |

### Stock Sale (Phase 3)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| grantId | uuid | FK → grants |
| exerciseEventId | uuid | FK → exercise events |
| saleDate | date | |
| sharesSold | numeric | |
| salePrice | numeric | per share |
| costBasis | numeric | per share (auto-computed) |
| gainLoss | numeric | computed |
| holdingPeriod | enum | `short-term`, `long-term` |
| isQualifyingDisposition | boolean | ISO only |
| createdAt | timestamp | |

---

## Vesting Schedule

```typescript
type VestingSchedule =
  | {
      type: "standard";
      totalMonths: number;       // e.g. 48
      cliffMonths: number;       // e.g. 12
      vestingFrequency: "monthly" | "quarterly" | "annually";
    }
  | {
      type: "custom";
      events: { date: string; shares: number }[];
    };
```

**Vest event generation (standard schedule):**
1. Nothing vests until `vestingStartDate + cliffMonths`
2. At cliff: `(cliffMonths / totalMonths) × totalShares` vest at once
3. After cliff: remaining shares vest per frequency until `totalMonths` reached
4. Vest events are auto-generated and stored in the vest_events table

---

## Computed Values (per grant)

These are derived, not stored:

```
Total shares:           grant.totalShares
Vested shares:          sum of vest_events where status = 'vested'
Exercised shares:       sum of exercise_events.sharesExercised
Exercisable (unsold):   vested - exercised
Shares held:            sum of exercise_events.sharesRetained - sum of sales.sharesSold
Unvested:               totalShares - vested
Expired:                if past expirationDate, unvested + unexercised vested

Current spread:         (currentPrice - strikePrice) per share
Exercisable value:      exercisable × max(0, currentPrice - strikePrice)
Held value:             sharesHeld × currentPrice
Unrealized gain:        sharesHeld × (currentPrice - costBasis)
```

---

## UI Pages

### Dashboard (`/equity-tracker`)

- **Total portfolio value** across all companies
- **Per-company cards**: name, ticker, price, number of grants, total value
- **Upcoming vests**: next 90 days across all grants
- Add company button

### Company Page (`/equity-tracker/company/:id`)

- Company header with name, ticker, current price (editable), price date
- **Grants table**: type, grant date, total shares, strike, status, current value
- **Summary**: total vested, exercisable, held shares, total value
- Add grant button

### Grant Page (`/equity-tracker/grant/:id`)

- Grant header: type badge (ISO/NSO), grant date, strike price, expiration, status
- **Vesting schedule**: table of vest events with date, shares, status
- **Share balance card**: visual breakdown of total → vested → exercised → held → sold
- **Exercise history** (Phase 2): list of exercises with method, shares, cost, tax
- **Sale history** (Phase 3): list of sales with price, gain/loss, holding period
- **Current value**: spread, exercisable value, held value

### Add Grant Flow

1. Pick company (or create new inline)
2. Pick type: ISO or NSO
3. Enter: grant date, total shares, strike price, FMV at grant, expiration date
4. Vesting: pick standard (total months, cliff, frequency) or custom dates
5. Save → vest events auto-generated

### Record Exercise (Phase 2)

From the grant page:
1. Click "Exercise Options"
2. Enter: date, number of shares, FMV on that date
3. Pick method: cash / sell-to-cover / same-day sale
4. For sell-to-cover: system shows computed shares sold vs retained
5. Enter tax withheld (if known)
6. Save

### Record Sale (Phase 3)

From the grant page (exercise history section):
1. Click "Sell Shares" on an exercise event
2. Enter: date, shares to sell, sale price
3. System shows: cost basis, gain/loss, holding period, qualifying status
4. Save

---

## The Connected Chain

Every share has a traceable path:

```
Grant (1000 ISOs at $10 strike, 4yr vest)
  └─ Vest Event (250 shares vest on 2025-03-15)
  └─ Vest Event (250 shares vest on 2026-03-15)
  └─ ...
       └─ Exercise (200 shares exercised on 2026-06-01, sell-to-cover)
            ├─ 50 shares sold to cover at $25
            └─ 150 shares retained
                 └─ Sale (100 shares sold on 2027-07-01 at $40)
                      → Qualifying disposition (>2yr from grant, >1yr from exercise)
                      → LTCG = ($40 - $10) × 100 = $3,000
                 └─ Sale (50 shares sold on 2026-09-01 at $30)
                      → Disqualifying (<1yr from exercise)
                      → Ordinary income = ($25 - $10) × 50 = $750
                      → STCG = ($30 - $25) × 50 = $250
```

The UI shows this chain clearly on the grant page — from vest events down to exercises down to sales, with running share balances at each level.

---

## Exercise Methods Detail

### Cash Exercise
```
Input:  shares=200, strike=$10, FMV=$25
Cost:   200 × $10 = $2,000 (out of pocket)
Result: 200 shares retained
ISO:    AMT adjustment = 200 × ($25-$10) = $3,000
NSO:    Ordinary income = 200 × ($25-$10) = $3,000, tax withheld ~$1,110
```

### Sell-to-Cover
```
Input:  shares=200, strike=$10, FMV=$25
Cost:   200 × $10 = $2,000
Tax:    $3,000 × 37% = $1,110 (NSO only)
Total to cover: $2,000 + $1,110 = $3,110
Shares sold: ceil($3,110 / $25) = 125 shares
Shares retained: 200 - 125 = 75 shares
ISO:    Sold 125 shares = disqualifying disposition
        Retained 75 shares = holding period starts
NSO:    Ordinary income on all 200 shares at exercise
```

### Same-Day Sale
```
Input:  shares=200, strike=$10, FMV=$25
Proceeds: 200 × $25 = $5,000
Cost:     200 × $10 = $2,000
Spread:   $3,000
Tax:      ~$1,110 (withheld)
Net cash: $5,000 - $2,000 - $1,110 = $1,890
Shares retained: 0
ISO:    All disqualifying — ordinary income = $3,000
NSO:    Ordinary income = $3,000
```

---

## Future Phases

### Phase 4: Early Exercise & 83(b) Elections
- Support exercising unvested options (common at startups with low FMV)
- Track 83(b) election filing: date filed, FMV at exercise, spread at exercise
- Tax at exercise: ordinary income on spread (if 83(b) filed), then no further income at vest
- Without 83(b): taxed at each vest date on the spread at that time
- Track the 30-day filing deadline from exercise date
- Clawback risk: if employee leaves before vesting, company repurchases unvested shares at strike
- Cost basis for future sale = FMV at exercise (if 83(b)) or FMV at vest (if not)

### Phase 5: RSUs
- Track RSU grants with vesting schedules
- Vest events taxed as ordinary income (FMV × shares)
- Tax withholding via share surrender
- Post-vest share sales

### Phase 6: ESPP
- Track offering periods and purchase dates
- Lookback provision calculations
- Qualifying vs disqualifying disposition tracking
- Discount income vs capital gains breakdown

### Phase 7: Tax Estimator Integration
- Flow vested RSU income into tax estimator as W-2 income
- Flow exercise events as income sources
- Flow sales as capital gains entries

### Phase 8: Advanced Features
- Exercise strategy modeling (ISO AMT optimization)
- Stock price API integration
- Export to CSV / tax preparer
- Equity comp comparison across job offers
