// ── Enums ───────────────────────────────────────────────────────

export type GrantType = "iso" | "nso" | "rsu";
export type GrantStatus = "active" | "fully_vested" | "expired" | "cancelled";
export type VestStatus = "scheduled" | "vested" | "forfeited";

// ── Vesting Schedule ────────────────────────────────────────────

export type VestingSchedule =
  | {
      type: "standard";
      totalMonths: number;
      cliffMonths: number;
      frequency: "monthly" | "quarterly" | "annually";
    }
  | {
      type: "custom";
      events: { date: string; shares: number }[];
    };

// ── Domain models ───────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  ticker: string | null;
  currentPrice: number | null;
  priceAsOf: string | null;
  isCurrent: boolean;
  separationDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Grant {
  id: string;
  grantId: string | null;
  companyId: string;
  grantType: GrantType;
  grantDate: string;
  totalShares: number;
  strikePrice: number;
  grantPrice: number | null;
  expirationDate: string | null;
  vestingStart: string | null;
  vestingSchedule: VestingSchedule | null;
  status: GrantStatus;
  notes: string | null;
  createdAt: Date;
}

export interface VestEvent {
  id: string;
  grantId: string;
  vestDate: string;
  shares: number;
  fmvAtVest: number | null;
  status: VestStatus;
}

export interface Exercise {
  id: string;
  referenceId: string | null;
  grantId: string;
  exerciseDate: string;
  shares: number;
  exercisePrice: number;
  fmvAtExercise: number;
  unvestedShares: number;
  filed83b: boolean;
  filed83bDate: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface Sale {
  id: string;
  referenceId: string | null;
  grantId: string;
  exerciseId: string | null;
  vestEventId: string | null;
  saleDate: string;
  shares: number;
  salePrice: number;
  costBasisPerShare: number;
  isLongTerm: boolean;
  notes: string | null;
  createdAt: Date;
}

// ── Computed lot info ────────────────────────────────────────────

export interface Lot {
  id: string;
  source: "exercise" | "vest";
  exerciseId?: string;
  vestEventId?: string;
  referenceId: string | null;
  acquiredDate: string;
  costBasis: number;
  sharesAcquired: number;
  sharesSold: number;
  sharesRemaining: number;
  grantType: GrantType;
  grantDate: string;
}

export interface CompanyWithGrants extends Company {
  grants: Grant[];
}

export interface GrantWithVesting extends Grant {
  vestEvents: VestEvent[];
  exercises: Exercise[];
  sales: Sale[];
  company: Company;
}

// ── Computed (not stored) ───────────────────────────────────────

export interface GrantSummary {
  totalShares: number;
  vestedShares: number;
  forfeitedShares: number;
  unvestedShares: number;
  exercisedShares: number;
  exercisableShares: number;
  soldShares: number;
  heldShares: number;
  remainingOptions: number;
  currentSpread: number;
  exercisableValue: number;
  totalCostBasis: number;
  totalSpreadAtExercise: number;
  totalProceeds: number;
  totalGainLoss: number;
  totalValue: number;
  isExpired: boolean;
  isFullyVested: boolean;
}

// ── Input types ─────────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string;
  ticker?: string;
  currentPrice?: number;
  priceAsOf?: string;
  isCurrent: boolean;
  separationDate?: string;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  id: string;
}

export interface CreateGrantInput {
  companyId: string;
  grantId?: string;
  grantType: GrantType;
  grantDate: string;
  totalShares: number;
  strikePrice: number;
  grantPrice?: number;
  expirationDate?: string;
  notes?: string;
}

export interface UpdateGrantInput extends Partial<Omit<CreateGrantInput, "companyId">> {
  id: string;
}

export interface CreateSaleInput {
  grantId: string;
  exerciseId?: string;
  vestEventId?: string;
  referenceId?: string;
  saleDate: string;
  shares: number;
  salePrice: number;
  costBasisPerShare: number;
  isLongTerm: boolean;
  notes?: string;
}

export interface CreateExerciseInput {
  grantId: string;
  referenceId?: string;
  exerciseDate: string;
  shares: number;
  exercisePrice: number;
  fmvAtExercise: number;
  unvestedShares?: number;
  filed83b?: boolean;
  filed83bDate?: string;
  notes?: string;
}
