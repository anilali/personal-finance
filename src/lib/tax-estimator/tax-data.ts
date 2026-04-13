import type { EstimateType, FilingStatus } from "./types";

// ── Bracket type ─────────────────────────────────────────────────

export interface TaxBracket {
  min: number;
  max: number; // Infinity for the top bracket
  rate: number;
}

// ── Federal income tax brackets ──────────────────────────────────

export const FEDERAL_BRACKETS: Record<
  string,
  Record<FilingStatus, TaxBracket[]>
> = {
  "2024": {
    single: [
      { min: 0, max: 11600, rate: 0.1 },
      { min: 11600, max: 47150, rate: 0.12 },
      { min: 47150, max: 100525, rate: 0.22 },
      { min: 100525, max: 191950, rate: 0.24 },
      { min: 191950, max: 243725, rate: 0.32 },
      { min: 243725, max: 609350, rate: 0.35 },
      { min: 609350, max: Infinity, rate: 0.37 },
    ],
    mfj: [
      { min: 0, max: 23200, rate: 0.1 },
      { min: 23200, max: 94300, rate: 0.12 },
      { min: 94300, max: 201050, rate: 0.22 },
      { min: 201050, max: 383900, rate: 0.24 },
      { min: 383900, max: 487450, rate: 0.32 },
      { min: 487450, max: 731200, rate: 0.35 },
      { min: 731200, max: Infinity, rate: 0.37 },
    ],
    mfs: [
      { min: 0, max: 11600, rate: 0.1 },
      { min: 11600, max: 47150, rate: 0.12 },
      { min: 47150, max: 100525, rate: 0.22 },
      { min: 100525, max: 191950, rate: 0.24 },
      { min: 191950, max: 243725, rate: 0.32 },
      { min: 243725, max: 365600, rate: 0.35 },
      { min: 365600, max: Infinity, rate: 0.37 },
    ],
    hoh: [
      { min: 0, max: 16550, rate: 0.1 },
      { min: 16550, max: 63100, rate: 0.12 },
      { min: 63100, max: 100500, rate: 0.22 },
      { min: 100500, max: 191950, rate: 0.24 },
      { min: 191950, max: 243700, rate: 0.32 },
      { min: 243700, max: 609350, rate: 0.35 },
      { min: 609350, max: Infinity, rate: 0.37 },
    ],
    qss: [
      { min: 0, max: 23200, rate: 0.1 },
      { min: 23200, max: 94300, rate: 0.12 },
      { min: 94300, max: 201050, rate: 0.22 },
      { min: 201050, max: 383900, rate: 0.24 },
      { min: 383900, max: 487450, rate: 0.32 },
      { min: 487450, max: 731200, rate: 0.35 },
      { min: 731200, max: Infinity, rate: 0.37 },
    ],
  },
  "2025": {
    single: [
      { min: 0, max: 11925, rate: 0.1 },
      { min: 11925, max: 48475, rate: 0.12 },
      { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250525, rate: 0.32 },
      { min: 250525, max: 626350, rate: 0.35 },
      { min: 626350, max: Infinity, rate: 0.37 },
    ],
    mfj: [
      { min: 0, max: 23850, rate: 0.1 },
      { min: 23850, max: 96950, rate: 0.12 },
      { min: 96950, max: 206700, rate: 0.22 },
      { min: 206700, max: 394600, rate: 0.24 },
      { min: 394600, max: 501050, rate: 0.32 },
      { min: 501050, max: 751600, rate: 0.35 },
      { min: 751600, max: Infinity, rate: 0.37 },
    ],
    mfs: [
      { min: 0, max: 11925, rate: 0.1 },
      { min: 11925, max: 48475, rate: 0.12 },
      { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250525, rate: 0.32 },
      { min: 250525, max: 375800, rate: 0.35 },
      { min: 375800, max: Infinity, rate: 0.37 },
    ],
    hoh: [
      { min: 0, max: 17000, rate: 0.1 },
      { min: 17000, max: 64850, rate: 0.12 },
      { min: 64850, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250500, rate: 0.32 },
      { min: 250500, max: 626350, rate: 0.35 },
      { min: 626350, max: Infinity, rate: 0.37 },
    ],
    qss: [
      { min: 0, max: 23850, rate: 0.1 },
      { min: 23850, max: 96950, rate: 0.12 },
      { min: 96950, max: 206700, rate: 0.22 },
      { min: 206700, max: 394600, rate: 0.24 },
      { min: 394600, max: 501050, rate: 0.32 },
      { min: 501050, max: 751600, rate: 0.35 },
      { min: 751600, max: Infinity, rate: 0.37 },
    ],
  },
  "2026": {
    single: [
      { min: 0, max: 12250, rate: 0.1 },
      { min: 12250, max: 49850, rate: 0.12 },
      { min: 49850, max: 106250, rate: 0.22 },
      { min: 106250, max: 202850, rate: 0.24 },
      { min: 202850, max: 257550, rate: 0.32 },
      { min: 257550, max: 643900, rate: 0.35 },
      { min: 643900, max: Infinity, rate: 0.37 },
    ],
    mfj: [
      { min: 0, max: 24500, rate: 0.1 },
      { min: 24500, max: 99700, rate: 0.12 },
      { min: 99700, max: 212500, rate: 0.22 },
      { min: 212500, max: 405700, rate: 0.24 },
      { min: 405700, max: 515100, rate: 0.32 },
      { min: 515100, max: 772650, rate: 0.35 },
      { min: 772650, max: Infinity, rate: 0.37 },
    ],
    mfs: [
      { min: 0, max: 12250, rate: 0.1 },
      { min: 12250, max: 49850, rate: 0.12 },
      { min: 49850, max: 106250, rate: 0.22 },
      { min: 106250, max: 202850, rate: 0.24 },
      { min: 202850, max: 257550, rate: 0.32 },
      { min: 257550, max: 386325, rate: 0.35 },
      { min: 386325, max: Infinity, rate: 0.37 },
    ],
    hoh: [
      { min: 0, max: 17500, rate: 0.1 },
      { min: 17500, max: 66700, rate: 0.12 },
      { min: 66700, max: 106250, rate: 0.22 },
      { min: 106250, max: 202850, rate: 0.24 },
      { min: 202850, max: 257500, rate: 0.32 },
      { min: 257500, max: 643900, rate: 0.35 },
      { min: 643900, max: Infinity, rate: 0.37 },
    ],
    qss: [
      { min: 0, max: 24500, rate: 0.1 },
      { min: 24500, max: 99700, rate: 0.12 },
      { min: 99700, max: 212500, rate: 0.22 },
      { min: 212500, max: 405700, rate: 0.24 },
      { min: 405700, max: 515100, rate: 0.32 },
      { min: 515100, max: 772650, rate: 0.35 },
      { min: 772650, max: Infinity, rate: 0.37 },
    ],
  },
};

// ── Standard deductions ──────────────────────────────────────────

export const STANDARD_DEDUCTIONS: Record<
  string,
  Record<FilingStatus, number>
> = {
  "2024": {
    single: 14600,
    mfj: 29200,
    mfs: 14600,
    hoh: 21900,
    qss: 29200,
  },
  "2025": {
    single: 15000,
    mfj: 30000,
    mfs: 15000,
    hoh: 22500,
    qss: 30000,
  },
  "2026": {
    single: 15400,
    mfj: 30800,
    mfs: 15400,
    hoh: 23100,
    qss: 30800,
  },
};

// ── Qualified dividends / LTCG rate brackets ─────────────────────

export const LTCG_BRACKETS: Record<
  string,
  Record<FilingStatus, TaxBracket[]>
> = {
  "2024": {
    single: [
      { min: 0, max: 47025, rate: 0 },
      { min: 47025, max: 518900, rate: 0.15 },
      { min: 518900, max: Infinity, rate: 0.2 },
    ],
    mfj: [
      { min: 0, max: 94050, rate: 0 },
      { min: 94050, max: 583750, rate: 0.15 },
      { min: 583750, max: Infinity, rate: 0.2 },
    ],
    mfs: [
      { min: 0, max: 47025, rate: 0 },
      { min: 47025, max: 291850, rate: 0.15 },
      { min: 291850, max: Infinity, rate: 0.2 },
    ],
    hoh: [
      { min: 0, max: 63000, rate: 0 },
      { min: 63000, max: 551350, rate: 0.15 },
      { min: 551350, max: Infinity, rate: 0.2 },
    ],
    qss: [
      { min: 0, max: 94050, rate: 0 },
      { min: 94050, max: 583750, rate: 0.15 },
      { min: 583750, max: Infinity, rate: 0.2 },
    ],
  },
  "2025": {
    single: [
      { min: 0, max: 48350, rate: 0 },
      { min: 48350, max: 533400, rate: 0.15 },
      { min: 533400, max: Infinity, rate: 0.2 },
    ],
    mfj: [
      { min: 0, max: 96700, rate: 0 },
      { min: 96700, max: 600050, rate: 0.15 },
      { min: 600050, max: Infinity, rate: 0.2 },
    ],
    mfs: [
      { min: 0, max: 48350, rate: 0 },
      { min: 48350, max: 300000, rate: 0.15 },
      { min: 300000, max: Infinity, rate: 0.2 },
    ],
    hoh: [
      { min: 0, max: 64750, rate: 0 },
      { min: 64750, max: 566700, rate: 0.15 },
      { min: 566700, max: Infinity, rate: 0.2 },
    ],
    qss: [
      { min: 0, max: 96700, rate: 0 },
      { min: 96700, max: 600050, rate: 0.15 },
      { min: 600050, max: Infinity, rate: 0.2 },
    ],
  },
  "2026": {
    single: [
      { min: 0, max: 49700, rate: 0 },
      { min: 49700, max: 548350, rate: 0.15 },
      { min: 548350, max: Infinity, rate: 0.2 },
    ],
    mfj: [
      { min: 0, max: 99400, rate: 0 },
      { min: 99400, max: 616850, rate: 0.15 },
      { min: 616850, max: Infinity, rate: 0.2 },
    ],
    mfs: [
      { min: 0, max: 49700, rate: 0 },
      { min: 49700, max: 308400, rate: 0.15 },
      { min: 308400, max: Infinity, rate: 0.2 },
    ],
    hoh: [
      { min: 0, max: 66550, rate: 0 },
      { min: 66550, max: 582550, rate: 0.15 },
      { min: 582550, max: Infinity, rate: 0.2 },
    ],
    qss: [
      { min: 0, max: 99400, rate: 0 },
      { min: 99400, max: 616850, rate: 0.15 },
      { min: 616850, max: Infinity, rate: 0.2 },
    ],
  },
};

// ── Net Investment Income Tax (NIIT) ─────────────────────────────

export const NIIT = {
  rate: 0.038,
  thresholds: {
    single: 200000,
    mfj: 250000,
    mfs: 125000,
    hoh: 200000,
    qss: 250000,
  } as Record<FilingStatus, number>,
} as const;

// ── FICA / Self-Employment ───────────────────────────────────────

export const FICA = {
  "2024": {
    socialSecurityRate: 0.062,
    socialSecurityWageBase: 168600,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000, qss: 200000 },
  },
  "2025": {
    socialSecurityRate: 0.062,
    socialSecurityWageBase: 176100,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000, qss: 200000 },
  },
  "2026": {
    socialSecurityRate: 0.062,
    socialSecurityWageBase: 181200,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000, qss: 200000 },
  },
} as const;

export const SELF_EMPLOYMENT = {
  rate: 0.153, // 12.4% SS + 2.9% Medicare
  socialSecurityPortion: 0.124,
  medicarePortion: 0.029,
  netEarningsMultiplier: 0.9235, // 92.35% of net SE income
  deductiblePortion: 0.5, // half of SE tax is deductible
} as const;

// ── State tax data ───────────────────────────────────────────────

export interface StateTaxConfig {
  name: string;
  hasIncomeTax: boolean;
  brackets: Record<FilingStatus, TaxBracket[]>;
  standardDeduction: Record<FilingStatus, number>;
}

export const STATE_TAX_DATA: Record<string, StateTaxConfig> = {
  CA: {
    name: "California",
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0, max: 10412, rate: 0.01 },
        { min: 10412, max: 24684, rate: 0.02 },
        { min: 24684, max: 38959, rate: 0.04 },
        { min: 38959, max: 54081, rate: 0.06 },
        { min: 54081, max: 68350, rate: 0.08 },
        { min: 68350, max: 349137, rate: 0.093 },
        { min: 349137, max: 418961, rate: 0.103 },
        { min: 418961, max: 698271, rate: 0.113 },
        { min: 698271, max: 1000000, rate: 0.123 },
        { min: 1000000, max: Infinity, rate: 0.133 },
      ],
      mfj: [
        { min: 0, max: 20824, rate: 0.01 },
        { min: 20824, max: 49368, rate: 0.02 },
        { min: 49368, max: 77918, rate: 0.04 },
        { min: 77918, max: 108162, rate: 0.06 },
        { min: 108162, max: 136700, rate: 0.08 },
        { min: 136700, max: 698274, rate: 0.093 },
        { min: 698274, max: 837922, rate: 0.103 },
        { min: 837922, max: 1396542, rate: 0.113 },
        { min: 1396542, max: 1000000, rate: 0.123 },
        { min: 1000000, max: Infinity, rate: 0.133 },
      ],
      mfs: [
        { min: 0, max: 10412, rate: 0.01 },
        { min: 10412, max: 24684, rate: 0.02 },
        { min: 24684, max: 38959, rate: 0.04 },
        { min: 38959, max: 54081, rate: 0.06 },
        { min: 54081, max: 68350, rate: 0.08 },
        { min: 68350, max: 349137, rate: 0.093 },
        { min: 349137, max: 418961, rate: 0.103 },
        { min: 418961, max: 698271, rate: 0.113 },
        { min: 698271, max: 1000000, rate: 0.123 },
        { min: 1000000, max: Infinity, rate: 0.133 },
      ],
      hoh: [
        { min: 0, max: 20839, rate: 0.01 },
        { min: 20839, max: 49371, rate: 0.02 },
        { min: 49371, max: 63644, rate: 0.04 },
        { min: 63644, max: 78765, rate: 0.06 },
        { min: 78765, max: 93037, rate: 0.08 },
        { min: 93037, max: 474824, rate: 0.093 },
        { min: 474824, max: 569790, rate: 0.103 },
        { min: 569790, max: 949649, rate: 0.113 },
        { min: 949649, max: 1000000, rate: 0.123 },
        { min: 1000000, max: Infinity, rate: 0.133 },
      ],
      qss: [
        { min: 0, max: 20824, rate: 0.01 },
        { min: 20824, max: 49368, rate: 0.02 },
        { min: 49368, max: 77918, rate: 0.04 },
        { min: 77918, max: 108162, rate: 0.06 },
        { min: 108162, max: 136700, rate: 0.08 },
        { min: 136700, max: 698274, rate: 0.093 },
        { min: 698274, max: 837922, rate: 0.103 },
        { min: 837922, max: 1396542, rate: 0.113 },
        { min: 1396542, max: 1000000, rate: 0.123 },
        { min: 1000000, max: Infinity, rate: 0.133 },
      ],
    },
    standardDeduction: { single: 5540, mfj: 11080, mfs: 5540, hoh: 11080, qss: 11080 },
  },
  NY: {
    name: "New York",
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0, max: 8500, rate: 0.04 },
        { min: 8500, max: 11700, rate: 0.045 },
        { min: 11700, max: 13900, rate: 0.0525 },
        { min: 13900, max: 80650, rate: 0.055 },
        { min: 80650, max: 215400, rate: 0.06 },
        { min: 215400, max: 1077550, rate: 0.0685 },
        { min: 1077550, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
      mfj: [
        { min: 0, max: 17150, rate: 0.04 },
        { min: 17150, max: 23600, rate: 0.045 },
        { min: 23600, max: 27900, rate: 0.0525 },
        { min: 27900, max: 161550, rate: 0.055 },
        { min: 161550, max: 323200, rate: 0.06 },
        { min: 323200, max: 2155350, rate: 0.0685 },
        { min: 2155350, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
      mfs: [
        { min: 0, max: 8500, rate: 0.04 },
        { min: 8500, max: 11700, rate: 0.045 },
        { min: 11700, max: 13900, rate: 0.0525 },
        { min: 13900, max: 80650, rate: 0.055 },
        { min: 80650, max: 215400, rate: 0.06 },
        { min: 215400, max: 1077550, rate: 0.0685 },
        { min: 1077550, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
      hoh: [
        { min: 0, max: 12800, rate: 0.04 },
        { min: 12800, max: 17650, rate: 0.045 },
        { min: 17650, max: 20900, rate: 0.0525 },
        { min: 20900, max: 107650, rate: 0.055 },
        { min: 107650, max: 269300, rate: 0.06 },
        { min: 269300, max: 1616450, rate: 0.0685 },
        { min: 1616450, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
      qss: [
        { min: 0, max: 17150, rate: 0.04 },
        { min: 17150, max: 23600, rate: 0.045 },
        { min: 23600, max: 27900, rate: 0.0525 },
        { min: 27900, max: 161550, rate: 0.055 },
        { min: 161550, max: 323200, rate: 0.06 },
        { min: 323200, max: 2155350, rate: 0.0685 },
        { min: 2155350, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
    },
    standardDeduction: { single: 8000, mfj: 16050, mfs: 8000, hoh: 11200, qss: 16050 },
  },
  NJ: {
    name: "New Jersey",
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 35000, rate: 0.0175 },
        { min: 35000, max: 40000, rate: 0.035 },
        { min: 40000, max: 75000, rate: 0.05525 },
        { min: 75000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
      mfj: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 50000, rate: 0.0175 },
        { min: 50000, max: 70000, rate: 0.0245 },
        { min: 70000, max: 80000, rate: 0.035 },
        { min: 80000, max: 150000, rate: 0.05525 },
        { min: 150000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
      mfs: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 35000, rate: 0.0175 },
        { min: 35000, max: 40000, rate: 0.035 },
        { min: 40000, max: 75000, rate: 0.05525 },
        { min: 75000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
      hoh: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 50000, rate: 0.0175 },
        { min: 50000, max: 70000, rate: 0.0245 },
        { min: 70000, max: 80000, rate: 0.035 },
        { min: 80000, max: 150000, rate: 0.05525 },
        { min: 150000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
      qss: [
        { min: 0, max: 20000, rate: 0.014 },
        { min: 20000, max: 50000, rate: 0.0175 },
        { min: 50000, max: 70000, rate: 0.0245 },
        { min: 70000, max: 80000, rate: 0.035 },
        { min: 80000, max: 150000, rate: 0.05525 },
        { min: 150000, max: 500000, rate: 0.0637 },
        { min: 500000, max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
    },
    standardDeduction: { single: 0, mfj: 0, mfs: 0, hoh: 0, qss: 0 }, // NJ has no standard deduction; uses personal exemptions
  },
  IL: {
    name: "Illinois",
    hasIncomeTax: true,
    brackets: {
      single: [{ min: 0, max: Infinity, rate: 0.0495 }],
      mfj: [{ min: 0, max: Infinity, rate: 0.0495 }],
      mfs: [{ min: 0, max: Infinity, rate: 0.0495 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0495 }],
      qss: [{ min: 0, max: Infinity, rate: 0.0495 }],
    },
    standardDeduction: { single: 0, mfj: 0, mfs: 0, hoh: 0, qss: 0 }, // IL uses personal exemptions ($2,625 per person)
  },
  PA: {
    name: "Pennsylvania",
    hasIncomeTax: true,
    brackets: {
      single: [{ min: 0, max: Infinity, rate: 0.0307 }],
      mfj: [{ min: 0, max: Infinity, rate: 0.0307 }],
      mfs: [{ min: 0, max: Infinity, rate: 0.0307 }],
      hoh: [{ min: 0, max: Infinity, rate: 0.0307 }],
      qss: [{ min: 0, max: Infinity, rate: 0.0307 }],
    },
    standardDeduction: { single: 0, mfj: 0, mfs: 0, hoh: 0, qss: 0 }, // PA has no standard deduction
  },
};

// ── No-income-tax states ─────────────────────────────────────────

export const NO_INCOME_TAX_STATES = new Set([
  "AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY",
]);

export const SUPPORTED_STATE_CALCULATIONS = new Set([
  ...Object.keys(STATE_TAX_DATA),
  ...NO_INCOME_TAX_STATES,
]);

// ── All US states (for dropdown) ─────────────────────────────────

export const STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

// ── Document type metadata ───────────────────────────────────────

export const DOCUMENT_TYPE_INFO: Record<
  string,
  { label: string; description: string; category: string; estimateTypes: EstimateType[] }
> = {
  w2: {
    label: "W-2",
    description: "Full year wages and salary from an employer",
    category: "Employment",
    estimateTypes: ["year-end"],
  },
  paystub: {
    label: "Paystub",
    description: "Year-to-date earnings from your latest pay stub",
    category: "Employment",
    estimateTypes: ["quarterly"],
  },
  "1099-nec": {
    label: "1099-NEC",
    description: "Nonemployee compensation / freelance income",
    category: "Employment",
    estimateTypes: ["year-end", "quarterly"],
  },
  "1099-div": {
    label: "1099-DIV",
    description: "Dividend income from investments",
    category: "Investments",
    estimateTypes: ["year-end", "quarterly"],
  },
  "1099-int": {
    label: "1099-INT",
    description: "Interest income from banks or bonds",
    category: "Investments",
    estimateTypes: ["year-end", "quarterly"],
  },
  "1099-b": {
    label: "1099-B",
    description: "Proceeds from broker transactions",
    category: "Investments",
    estimateTypes: ["year-end", "quarterly"],
  },
  "1099-oid": {
    label: "1099-OID",
    description: "Original issue discount income",
    category: "Investments",
    estimateTypes: ["year-end"],
  },
  "8949": {
    label: "Form 8949",
    description: "Sales and dispositions of capital assets",
    category: "Investments",
    estimateTypes: ["year-end"],
  },
  "brokerage-trades": {
    label: "Brokerage Trades",
    description: "Stocks, ETFs, or crypto you've sold this year",
    category: "Investments",
    estimateTypes: ["quarterly"],
  },
  "1099-r": {
    label: "1099-R",
    description: "Distributions from retirement accounts",
    category: "Retirement",
    estimateTypes: ["year-end", "quarterly"],
  },
  "5498": {
    label: "Form 5498",
    description: "IRA contribution information",
    category: "Retirement",
    estimateTypes: ["year-end"],
  },
  "1099-misc": {
    label: "1099-MISC",
    description: "Miscellaneous income (rents, royalties, etc.)",
    category: "Other Income",
    estimateTypes: ["year-end", "quarterly"],
  },
  "schedule-k1": {
    label: "Schedule K-1",
    description: "Partner/shareholder share of income",
    category: "Other Income",
    estimateTypes: ["year-end", "quarterly"],
  },
  "1098": {
    label: "Form 1098",
    description: "Mortgage interest paid",
    category: "Deductions",
    estimateTypes: ["year-end", "quarterly"],
  },
};

export const DOCUMENT_CATEGORIES = [
  "Employment",
  "Investments",
  "Retirement",
  "Other Income",
  "Deductions",
] as const;

// ── Filing status labels ─────────────────────────────────────────

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: "Single",
  mfj: "Married Filing Jointly",
  mfs: "Married Filing Separately",
  hoh: "Head of Household",
  qss: "Qualifying Surviving Spouse",
};
